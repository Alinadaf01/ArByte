from django.contrib.auth.models import Group, Permission
from django.db import transaction
from rest_framework import serializers, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from .activity import log_admin_action
from .models import AdminRole
from .permissions import IsAdminStaff, require_section
from .sections import SECTION_ACTIONS, SECTION_LABELS, SECTIONS, SENSITIVE_SECTIONS, codename


def _grants_from_group(group: Group) -> dict[str, list[str]]:
    grants: dict[str, list[str]] = {}
    for perm in group.permissions.select_related("content_type").filter(content_type__app_label="admin_api"):
        for section, actions in SECTION_ACTIONS.items():
            for action in actions:
                if perm.codename == codename(section, action):
                    grants.setdefault(section, []).append(action)
    return grants


def _validate_grants(grants: dict) -> dict[str, list[str]]:
    if not isinstance(grants, dict):
        raise ValidationError({"grants": "باید یک آبجکت {بخش: [عمل‌ها]} باشد."})
    cleaned: dict[str, list[str]] = {}
    for section, actions in grants.items():
        if section not in SECTION_ACTIONS:
            raise ValidationError({"grants": f"بخش «{section}» شناخته‌شده نیست."})
        if not isinstance(actions, list) or not all(isinstance(a, str) for a in actions):
            raise ValidationError({"grants": f"عمل‌های بخش «{section}» باید فهرستی از رشته باشد."})
        invalid = set(actions) - set(SECTION_ACTIONS[section])
        if invalid:
            raise ValidationError({"grants": f"بخش «{section}» عمل‌های {sorted(invalid)} را ندارد."})
        cleaned[section] = sorted(set(actions))
    return cleaned


class AdminRoleSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()
    name = serializers.CharField(source="group.name")
    grants = serializers.SerializerMethodField()

    class Meta:
        model = AdminRole
        fields = ["id", "name", "description", "is_system", "grants"]
        read_only_fields = ["is_system"]

    def get_id(self, obj: AdminRole) -> str:
        return str(obj.pk)

    def get_grants(self, obj: AdminRole) -> dict[str, list[str]]:
        return _grants_from_group(obj.group)


class AdminRoleListCreateView(ListCreateAPIView):
    permission_classes = [require_section("roles")]
    serializer_class = AdminRoleSerializer
    pagination_class = None
    queryset = AdminRole.objects.select_related("group").prefetch_related("group__permissions")

    def create(self, request, *args, **kwargs):
        name = (request.data.get("name") or "").strip()
        description = request.data.get("description", "")
        grants = _validate_grants(request.data.get("grants") or {})
        if not name:
            raise ValidationError({"name": "نام نقش الزامی است."})
        if Group.objects.filter(name=name).exists():
            raise ValidationError({"name": "نقشی با این نام از قبل وجود دارد."})

        with transaction.atomic():
            group = Group.objects.create(name=name)
            role = AdminRole.objects.create(group=group, description=description, is_system=False)
            codenames = [codename(section, action) for section, actions in grants.items() for action in actions]
            perms = Permission.objects.filter(content_type__app_label="admin_api", codename__in=codenames)
            group.permissions.set(perms)

        log_admin_action(
            user=request.user, action="create", model_name="AdminRole", object_id=role.pk,
            changes={"name": [None, name], "grants": [None, grants]},
        )
        return Response(AdminRoleSerializer(role).data, status=status.HTTP_201_CREATED)


class AdminRoleDetailView(RetrieveUpdateDestroyAPIView):
    permission_classes = [require_section("roles")]
    serializer_class = AdminRoleSerializer
    queryset = AdminRole.objects.select_related("group").prefetch_related("group__permissions")

    def _assert_not_own_role(self, request, role: AdminRole):
        # §7.5: "کاربر نتواند نقش خودش را ویرایش کند یا دسترسی خودش را بالا
        # ببرد" — superusers are exempt since they already bypass every
        # check regardless of what any Group grants them.
        if request.user.is_superuser:
            return
        if request.user.groups.filter(pk=role.group_id).exists():
            raise PermissionDenied("نمی‌توانید نقش خودتان را ویرایش کنید.")

    def update(self, request, *args, **kwargs):
        role = self.get_object()
        self._assert_not_own_role(request, role)

        before_name = role.group.name
        before_description = role.description
        before_grants = _grants_from_group(role.group)

        name = request.data.get("name")
        if name is not None:
            name = name.strip()
            if not name:
                raise ValidationError({"name": "نام نقش نمی‌تواند خالی باشد."})
            if Group.objects.exclude(pk=role.group_id).filter(name=name).exists():
                raise ValidationError({"name": "نقشی با این نام از قبل وجود دارد."})

        description = request.data.get("description", role.description)
        grants = _validate_grants(request.data["grants"]) if "grants" in request.data else before_grants

        with transaction.atomic():
            if name is not None:
                role.group.name = name
                role.group.save(update_fields=["name"])
            role.description = description
            role.save(update_fields=["description"])
            codenames = [codename(section, action) for section, actions in grants.items() for action in actions]
            perms = Permission.objects.filter(content_type__app_label="admin_api", codename__in=codenames)
            role.group.permissions.set(perms)

        log_admin_action(
            user=request.user, action="update", model_name="AdminRole", object_id=role.pk,
            changes={
                "name": [before_name, role.group.name],
                "description": [before_description, description],
                "grants": [before_grants, grants],
            },
        )
        return Response(AdminRoleSerializer(role).data)

    def destroy(self, request, *args, **kwargs):
        role = self.get_object()
        if role.is_system:
            return Response({"detail": "نقش‌های پیش‌فرض سیستم قابل حذف نیستند."}, status=status.HTTP_400_BAD_REQUEST)
        self._assert_not_own_role(request, role)
        name = role.group.name
        role.group.delete()  # cascades to AdminRole
        log_admin_action(user=request.user, action="delete", model_name="AdminRole", object_id=role.pk, changes={"name": [name, None]})
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminRoleSectionsView(APIView):
    """Static catalog the checkbox-matrix UI renders from — sections (rows),
    their available actions (columns), and which are flagged sensitive
    (§7.5's 'بخش‌های حساس', shown with a warning style, never pre-checked)."""

    permission_classes = [require_section("roles")]

    def get(self, request):
        return Response(
            [
                {
                    "key": key,
                    "label": SECTION_LABELS[key],
                    "actions": SECTION_ACTIONS[key],
                    "sensitive": key in SENSITIVE_SECTIONS,
                }
                for key, _, _ in SECTIONS
            ]
        )


class AdminMyPermissionsView(APIView):
    """GET /api/admin/me/permissions/ — the logged-in user's own grants, for
    the frontend to hide (not secure, just declutter) nav items and buttons
    it already knows the server will reject. §7.5: 'فرانت پس از ورود لیست
    مجوزهای کاربر را بگیرد ... به‌عنوان تجربه کاربری، نه امنیت'."""

    permission_classes = [IsAdminStaff]  # any authenticated staff — this IS the "what am I allowed" query itself

    def get(self, request):
        if request.user.is_superuser:
            grants = {key: list(actions) for key, _, actions in SECTIONS}
        else:
            groups = request.user.groups.prefetch_related("permissions__content_type")
            grants = {}
            for group in groups:
                for section, actions in _grants_from_group(group).items():
                    grants.setdefault(section, [])
                    grants[section] = sorted(set(grants[section]) | set(actions))

        return Response({"isSuperuser": request.user.is_superuser, "grants": grants})
