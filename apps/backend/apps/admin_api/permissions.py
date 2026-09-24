from rest_framework.permissions import BasePermission

from .sections import SECTION_ACTIONS, perm_string


class IsAdminStaff(BasePermission):
    """Bare staff gate — only for endpoints with no natural section (login,
    token refresh, dashboard, the roles-list used to populate a picker).
    Every section-scoped view should use require_section() below instead."""

    message = "دسترسی به این بخش فقط برای کارکنان مجاز است."

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


_METHOD_ACTION = {
    "GET": "view",
    "HEAD": "view",
    "OPTIONS": "view",
    "POST": "create",
    "PUT": "edit",
    "PATCH": "edit",
    "DELETE": "delete",
}


def _resolve_action(section: str, action: str | None, method: str) -> str:
    resolved = action or _METHOD_ACTION.get(method, "view")
    available = SECTION_ACTIONS.get(section, [])
    if resolved in available:
        return resolved
    # A section with no "create"/"delete" action (e.g. "orders" only has
    # view/edit) can still have POST/DELETE endpoints — status-transition
    # actions, bulk operations, etc. Those are edits in substance, so fall
    # back to "edit" instead of checking a permission that could never exist.
    return "edit" if "edit" in available else "view"


def require_section(section: str, *, action: str | None = None):
    """Returns a DRF permission class scoped to one section.action pair
    (BACKEND-TASK.md §7.5). If `action` is omitted it's derived from the
    HTTP method (GET->view, POST->create, PUT/PATCH->edit, DELETE->delete),
    then falls back to "edit" if the section doesn't actually have that
    action (see _resolve_action) — pass `action` explicitly only to force a
    specific action regardless of method.

    Superusers bypass every check, matching §7.5's 'سوپریوزر از همه
    بررسی‌ها عبور می‌کند'. Everyone else needs the real Django Permission —
    checked via user.has_perm(), which aggregates group + user-level grants."""

    class _SectionPermission(BasePermission):
        message = "دسترسی به این بخش را ندارید."

        def has_permission(self, request, view) -> bool:
            user = request.user
            if not (user and user.is_authenticated and user.is_staff):
                return False
            if user.is_superuser:
                return True
            required_action = _resolve_action(section, action, request.method)
            return user.has_perm(perm_string(section, required_action))

    _SectionPermission.__name__ = f"Require_{section}_{action or 'auto'}"
    return _SectionPermission
