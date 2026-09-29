import { useNavigate } from "react-router-dom";
import { Chip } from "@/components/ui/Chip";
import { formatPrice, formatJalaliDate } from "@/lib/formatters";
import { STATUS_TONE, statusLabel, type AdminOrder } from "@/types/order";

export function OrderRow({ order }: { order: AdminOrder }) {
  const navigate = useNavigate();

  return (
    <tr
      className="cursor-pointer transition-colors hover:bg-white/[0.02]"
      onClick={() => navigate(`/orders/${order.id}`)}
    >
      <td className="px-6 py-3 font-mono text-xs text-brand-300" dir="ltr">
        {order.orderNumber}
      </td>
      <td className="px-4 py-3">
        <p className="m-0 font-semibold text-white">
          {order.shippingRecipientName || "—"}
        </p>
        <p className="m-0 text-[11px] text-slate-500" dir="ltr">
          {order.shippingMobile}
        </p>
      </td>
      <td className="px-4 py-3 text-slate-400">
        {formatJalaliDate(order.createdAt)}
      </td>
      <td className="px-4 py-3 font-bold text-white">
        {formatPrice(order.finalTotal)}
      </td>
      <td className="px-4 py-3">
        <Chip tone={STATUS_TONE[order.status]} dot>
          {statusLabel(order.status)}
        </Chip>
      </td>
    </tr>
  );
}
