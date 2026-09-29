import { useNavigate } from "react-router-dom";
import { Chip } from "@/components/ui/Chip";
import { formatJalaliDate } from "@/lib/formatters";
import type { AdminUserListItem } from "@/types/user";

export function UserRow({ user }: { user: AdminUserListItem }) {
  const navigate = useNavigate();
  return (
    <tr
      className="cursor-pointer transition-colors hover:bg-white/[0.02]"
      onClick={() => navigate(`/users/${user.id}`)}
    >
      <td className="px-6 py-3">
        <p className="m-0 font-semibold text-white">
          {user.firstName || user.lastName
            ? `${user.firstName} ${user.lastName}`.trim()
            : "—"}
        </p>
        <p className="m-0 text-[11px] text-slate-500" dir="ltr">
          {user.phone}
        </p>
      </td>
      <td className="px-4 py-3 text-slate-400" dir="ltr">
        {user.email || "—"}
      </td>
      <td className="px-4 py-3 text-slate-400">
        {formatJalaliDate(user.createdAt)}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          <Chip tone={user.isVerified ? "success" : "neutral"}>
            {user.isVerified ? "تأیید‌شده" : "تأییدنشده"}
          </Chip>
          {!user.isActive && <Chip tone="danger">غیرفعال</Chip>}
          {user.isStaff && <Chip tone="brand">ادمین</Chip>}
        </div>
      </td>
    </tr>
  );
}
