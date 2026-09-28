from rest_framework.permissions import BasePermission


class IsNotImpersonating(BasePermission):
    """A support-mode session (ImpersonationTicket / D-04's public
    ImpersonateExchangeView) can browse and read like the real customer to
    reproduce a reported bug, but must not act on their behalf per
    IMPERSONATION_BLOCKED_ACTIONS (packages/contracts/src/auth/index.ts).

    The 'imp' claim (matching JwtPayloadSchema — not the vybeshop-original
    'impersonated' key) is only ever set by ImpersonateExchangeView on the
    access token it issues; a normal OTP login never carries it."""

    message = "این عملیات در نشست پشتیبانی مجاز نیست."

    def has_permission(self, request, view) -> bool:
        token = request.auth
        return not bool(token and token.get("imp"))
