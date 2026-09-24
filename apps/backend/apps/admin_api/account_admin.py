import secrets
import string

from django.conf import settings
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from apps.users.models import ImpersonationTicket, User

from .activity import log_admin_action


class IsSuperuser(BasePermission):
    """§7.6 — password reset, impersonation and force-logout are all
    superuser-only, stricter than any section grant a regular staff role
    could hold (a محدود admin can't reset another admin's password even if
    they somehow had a "users" edit grant)."""

    message = "این عملیات فقط برای سوپریوزر مجاز است."

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


def _generate_password(length: int = 14) -> str:
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return "".join(secrets.choice(alphabet) for _ in range(length))


class AdminResetPasswordView(APIView):
    """§7.6-۱. Passwords are hashed and never recoverable — this is the
    replacement capability: a brand-new password, shown exactly once in this
    response, never stored or logged in plain text anywhere (not even in
    AdminActivityLog). The user must change it on their next login."""

    permission_classes = [IsSuperuser]

    def post(self, request, user_id):
        target = User.objects.get(pk=user_id)
        if not target.is_staff:
            return Response({"detail": "بازنشانی رمز فقط برای کاربران staff ممکن است."}, status=400)

        new_password = _generate_password()
        target.set_password(new_password)
        target.must_change_password = True
        target.save(update_fields=["password", "must_change_password"])

        log_admin_action(user=request.user, action="reset_password", model_name="User", object_id=target.pk)
        return Response({"password": new_password})


class AdminImpersonateView(APIView):
    """§7.6-۲ (redesigned) — never returns a real JWT to the admin panel.
    Issues a short-lived (60s), single-use ImpersonationTicket instead, and
    a ready-made storefront link carrying it as a query param. The ticket
    itself is fine to travel through a URL / browser history / server log —
    it's worthless the instant it's consumed or a moment later, whichever
    comes first — but the powerful session token it exchanges for never is,
    and never appears in a URL (see ImpersonateConsumeView).

    Restricted to non-staff targets — impersonating another staff member
    isn't what this is for. The actual "session started" activity-log entry
    is written when the ticket is redeemed (apps.users.views), not here —
    a ticket the admin requests but never uses shouldn't read as a support
    session that happened."""

    permission_classes = [IsSuperuser]

    def post(self, request, user_id):
        target = User.objects.get(pk=user_id)
        if target.is_staff:
            return Response({"detail": "ورود به‌جای کاربران staff مجاز نیست."}, status=400)

        ticket = ImpersonationTicket.issue(target_user=target, issued_by=request.user)
        return Response(
            {
                "ticket": ticket.token,
                "expiresInSeconds": ImpersonationTicket.TICKET_LIFETIME_SECONDS,
                "url": f"{settings.FRONTEND_BASE_URL}/impersonate?ticket={ticket.token}",
            }
        )


class AdminForceLogoutView(APIView):
    """§7.6-۳ — blacklists every outstanding refresh token for the user, so
    any session that's still holding one (however it was obtained) can no
    longer mint new access tokens."""

    permission_classes = [IsSuperuser]

    def post(self, request, user_id):
        target = User.objects.get(pk=user_id)
        tokens = OutstandingToken.objects.filter(user=target)
        revoked = 0
        for token in tokens:
            _, created = BlacklistedToken.objects.get_or_create(token=token)
            if created:
                revoked += 1

        log_admin_action(
            user=request.user, action="force_logout", model_name="User", object_id=target.pk,
            changes={"tokens_revoked": revoked},
        )
        return Response({"tokensRevoked": revoked})
