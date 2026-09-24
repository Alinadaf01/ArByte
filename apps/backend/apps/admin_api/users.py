import django_filters
from django.contrib.auth.models import Group
from django.db.models import Q
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import ListAPIView, ListCreateAPIView, RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.models import Address, User

from .activity import AdminActivityLogMixin
from .models import AdminRole
from .permissions import require_section


def _user_role(user: User) -> AdminRole | None:
    return AdminRole.objects.select_related("group").filter(group__user=user).first()


def _is_last_general_manager(user: User) -> bool:
    """§7.5: 'آخرین مدیر کل قابل حذف یا تنزل نباشد' — true if removing this
    user's مدیر کل membership (or deactivating/de-staffing them) would leave
    the panel with no one who can manage everything."""
    if user.is_superuser:
        return False  # a remaining superuser always covers this regardless of role
    general_manager_group = Group.objects.filter(name="مدیر کل").first()
    if not general_manager_group or not user.groups.filter(pk=general_manager_group.pk).exists():
        return False
    other_managers = User.objects.filter(
        groups=general_manager_group, is_active=True, is_staff=True
    ).exclude(pk=user.pk)
    other_superusers = User.objects.filter(is_superuser=True, is_active=True, is_staff=True).exclude(pk=user.pk)
    return not (other_managers.exists() or other_superusers.exists())


class AdminAddressSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()

    class Meta:
        model = Address
        fields = ["id", "title", "province", "city", "line", "postal_code", "receiver_name", "receiver_phone", "is_default"]

    def get_id(self, obj: Address) -> str:
        return str(obj.pk)


class AdminUserListSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    role_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "phone", "first_name", "last_name", "email", "is_verified", "is_active", "is_staff", "role", "role_name", "created_at"]

    def get_id(self, obj: User) -> str:
        return str(obj.pk)

    def get_role(self, obj: User) -> str | None:
        role = _user_role(obj)
        return str(role.pk) if role else None

    def get_role_name(self, obj: User) -> str | None:
        role = _user_role(obj)
        return role.name if role else None


class AdminUserDetailSerializer(AdminUserListSerializer):
    addresses = AdminAddressSerializer(many=True, read_only=True)
    order_count = serializers.SerializerMethodField()

    class Meta(AdminUserListSerializer.Meta):
        fields = AdminUserListSerializer.Meta.fields + ["addresses", "order_count"]

    def get_order_count(self, obj: User) -> int:
        return obj.orders.count()


class AdminCreateUserSerializer(serializers.ModelSerializer):
    role_id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = ["phone", "first_name", "last_name", "email", "is_verified", "is_staff", "role_id"]

    def validate(self, attrs):
        # §7.5: "هنگام ساخت کاربر جدید staff، انتخاب نقش اجباری باشد"
        if attrs.get("is_staff") and not attrs.get("role_id"):
            raise ValidationError({"role_id": "انتخاب نقش برای کاربر staff الزامی است."})
        return attrs

    def validate_role_id(self, value):
        if value is not None and not AdminRole.objects.filter(pk=value).exists():
            raise ValidationError("نقش یافت نشد.")
        return value

    def create(self, validated_data):
        role_id = validated_data.pop("role_id", None)
        user = User.objects.create_user(**validated_data)
        if role_id:
            role = AdminRole.objects.get(pk=role_id)
            user.groups.set([role.group])
        return user


class AdminUserFilter(django_filters.FilterSet):
    search = django_filters.CharFilter(method="filter_search")
    isVerified = django_filters.BooleanFilter(field_name="is_verified")

    class Meta:
        model = User
        fields = []

    def filter_search(self, queryset, name, value):
        return queryset.filter(Q(phone__icontains=value) | Q(first_name__icontains=value) | Q(last_name__icontains=value))


class AdminUserListCreateView(AdminActivityLogMixin, ListCreateAPIView):
    permission_classes = [require_section("users")]
    filterset_class = AdminUserFilter
    queryset = User.objects.all()

    def get_serializer_class(self):
        return AdminCreateUserSerializer if self.request.method == "POST" else AdminUserListSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(AdminUserDetailSerializer(serializer.instance).data, status=201)


class AdminUserDetailView(AdminActivityLogMixin, RetrieveUpdateAPIView):
    permission_classes = [require_section("users")]
    serializer_class = AdminUserDetailSerializer
    queryset = User.objects.prefetch_related("addresses")

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        data = request.data

        # §7.5: a non-superuser can't reassign their own role (that's just
        # self-escalation one level removed from editing the role itself).
        if "role_id" in data and instance.pk == request.user.pk and not request.user.is_superuser:
            raise PermissionDenied("نمی‌توانید نقش خودتان را تغییر دهید.")

        current_role = _user_role(instance)
        current_role_id = str(current_role.pk) if current_role else None
        incoming_role_id = str(data["role_id"]) if data.get("role_id") else None
        role_is_changing = "role_id" in data and incoming_role_id != current_role_id
        would_lose_manager_status = (
            role_is_changing
            or ("is_active" in data and not data["is_active"])
            or ("is_staff" in data and not data["is_staff"])
        )
        if would_lose_manager_status and _is_last_general_manager(instance):
            raise ValidationError({"detail": "این کاربر آخرین «مدیر کل» است — نمی‌توان نقش یا دسترسی او را تنزل داد."})

        new_role = None
        if "role_id" in data and data.get("role_id"):
            new_role = AdminRole.objects.filter(pk=data["role_id"]).first()
            if new_role is None:
                raise ValidationError({"role_id": "نقش یافت نشد."})

        response = super().update(request, *args, **kwargs)

        if "role_id" in data:
            instance.groups.set([new_role.group] if new_role else [])
            response.data = AdminUserDetailSerializer(instance).data

        return response


class AdminUserAddressListView(ListAPIView):
    permission_classes = [require_section("users")]
    serializer_class = AdminAddressSerializer
    pagination_class = None

    def get_queryset(self):
        return Address.objects.filter(user_id=self.kwargs["user_id"])


class AdminCustomerStatementPdfView(APIView):
    permission_classes = [require_section("users")]

    def get(self, request, user_id):
        from apps.documents.customer_statement import render_customer_statement_pdf
        from apps.documents.responses import pdf_filename, pdf_response

        user = User.objects.get(pk=user_id)
        pdf_bytes = render_customer_statement_pdf(user, generated_by_name=request.user.get_full_name())
        return pdf_response(pdf_bytes, pdf_filename(f"customer-statement-{user.phone}"))
