from django.contrib.auth import authenticate
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.users.models import User

from .permissions import IsAdminStaff


class AdminLoginSerializer(serializers.Serializer):
    phone = serializers.CharField()
    password = serializers.CharField()


class AdminUserBriefSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "phone", "first_name", "last_name", "is_staff", "is_superuser", "must_change_password"]

    def get_id(self, obj: User) -> str:
        return str(obj.pk)


class AdminLoginView(APIView):
    """Separate from the storefront's OTP flow entirely — staff use a real
    password (set via createsuperuser or Django admin), never OTP. A
    non-staff user with a password (shouldn't normally exist, but not
    impossible) still gets 401, not a session — is_staff is checked here,
    not just relied on at the permission-class layer downstream."""

    permission_classes = [AllowAny]
    # No account-lockout mechanism exists, so this is the only brute-force
    # guard on the admin password (§7.5 security review) — public-facing
    # panel, worth being stricter than the storefront's own endpoints.
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "admin_login"

    def post(self, request):
        serializer = AdminLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request, phone=serializer.validated_data["phone"], password=serializer.validated_data["password"]
        )
        if user is None or not user.is_staff:
            return Response({"detail": "شماره یا رمز عبور اشتباه است."}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": AdminUserBriefSerializer(user).data,
            }
        )


class AdminChangePasswordView(APIView):
    """Self-service — also how a user clears must_change_password after a
    superuser reset (§7.6-۱). Requires the current password even in the
    forced-reset case: the user already knows it (it's the one-time value
    just shown to them), and this stops a still-open old session from being
    able to silently relock the account."""

    permission_classes = [IsAdminStaff]

    def post(self, request):
        current_password = request.data.get("current_password", "")
        new_password = request.data.get("new_password", "")
        if not request.user.check_password(current_password):
            return Response({"current_password": "رمز فعلی اشتباه است."}, status=status.HTTP_400_BAD_REQUEST)
        if len(new_password) < 8:
            return Response({"new_password": "رمز جدید باید حداقل ۸ کاراکتر باشد."}, status=status.HTTP_400_BAD_REQUEST)
        request.user.set_password(new_password)
        request.user.must_change_password = False
        request.user.save(update_fields=["password", "must_change_password"])
        return Response({"detail": "رمز عبور با موفقیت تغییر کرد."})
