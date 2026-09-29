import { useQuery } from "@tanstack/react-query";
import { getMyPermissions } from "@/lib/api";
import { useAdminAuth } from "@/lib/AdminAuthContext";
import type { SectionAction } from "@/types/role";

/** §7.5: "فرانت پس از ورود لیست مجوزهای کاربر را بگیرد و آیتم‌های ناوبری و
 * دکمه‌های غیرمجاز را مخفی کند — به‌عنوان تجربه کاربری، نه امنیت." Every
 * real check still happens server-side (require_section); this is purely
 * to avoid showing a nav item or button the server would 403 anyway. */
export function usePermissions() {
  const { isAuthenticated } = useAdminAuth();
  const { data } = useQuery({
    queryKey: ["my-permissions"],
    queryFn: getMyPermissions,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  function can(
    section: string | undefined,
    action: SectionAction = "view",
  ): boolean {
    if (!section) return true; // ungated items (dashboard) are always visible
    if (!data) return true; // still loading — don't flash-hide items before the first response
    if (data.isSuperuser) return true;
    return data.grants[section]?.includes(action) ?? false;
  }

  return {
    can,
    isSuperuser: data?.isSuperuser ?? false,
    isLoaded: data !== undefined,
  };
}
