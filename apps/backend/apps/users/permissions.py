from rest_framework.permissions import BasePermission


class IsNotImpersonating(BasePermission):
    """A support-mode session (ImpersonationTicket / ImpersonateConsumeView)
    can browse and read like the real customer to reproduce a reported bug,
    but must not act on their behalf. Apply alongside IsAuthenticated on any
    endpoint that changes account state or places a real order — checkout,
    address deletion, and any future password/phone-change endpoint.

    The 'impersonated' claim is only ever set by ImpersonateConsumeView on
    the access token it issues; a normal OTP login never carries it."""

    message = "این عملیات در نشست پشتیبانی مجاز نیست."

    def has_permission(self, request, view) -> bool:
        token = request.auth
        return not bool(token and token.get("impersonated"))
