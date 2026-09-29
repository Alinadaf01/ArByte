import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/lib/AdminAuthContext";

/** Every panel route sits behind this — redirect to /login on no session,
 * same rule as a 401 mid-session (see api.ts's authorizedFetch, which clears
 * storage on a failed refresh; the next render here catches that). */
export function RequireStaffAuth() {
  const { isAuthenticated, user } = useAdminAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  // §7.6-۱ — a superuser-reset password forces a change before anything else
  // in the panel is reachable, not just a dismissible notice.
  if (user?.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }
  return <Outlet />;
}
