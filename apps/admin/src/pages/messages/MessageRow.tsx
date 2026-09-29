import { useNavigate } from "react-router-dom";
import { Chip } from "@/components/ui/Chip";
import { formatJalaliDateTime } from "@/lib/formatters";
import type { AdminContactMessage } from "@/types/message";

export function MessageRow({ message }: { message: AdminContactMessage }) {
  const navigate = useNavigate();
  return (
    <tr
      className="cursor-pointer transition-colors hover:bg-white/[0.02]"
      onClick={() => navigate(`/messages/${message.id}`)}
    >
      <td className="px-6 py-3">
        <p className="m-0 font-semibold text-white">{message.name}</p>
        <p className="m-0 text-[11px] text-slate-500" dir="ltr">
          {message.email}
        </p>
      </td>
      <td className="px-4 py-3 text-slate-300">{message.subject}</td>
      <td className="px-4 py-3 text-slate-400">
        {formatJalaliDateTime(message.submittedAt)}
      </td>
      <td className="px-4 py-3">
        <Chip tone={message.isRead ? "neutral" : "brand"} dot>
          {message.isRead ? "خوانده‌شده" : "خوانده‌نشده"}
        </Chip>
      </td>
    </tr>
  );
}
