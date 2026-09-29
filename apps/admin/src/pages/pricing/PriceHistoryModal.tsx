import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import { listPriceHistory } from "@/lib/api";
import { formatJalaliDateTime, formatPrice } from "@/lib/formatters";
import type { ProductPriceRow } from "@/types/pricing";

export function PriceHistoryModal({
  product,
  onClose,
}: {
  product: ProductPriceRow | null;
  onClose: () => void;
}) {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["price-history", product?.id],
    queryFn: () => listPriceHistory(product!.id),
    enabled: !!product,
  });

  if (!product) return null;
  const entries = data?.results ?? [];

  return (
    <Modal
      open={!!product}
      onClose={onClose}
      title={`تاریخچه قیمت «${product.name}»`}
      widthClass="max-w-lg"
    >
      {isPending ? (
        <p className="py-8 text-center text-sm text-slate-500">
          در حال بارگذاری…
        </p>
      ) : isError ? (
        <ErrorState
          description="دریافت تاریخچه قیمت ناموفق بود."
          onRetry={() => refetch()}
        />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={History}
          title="تاریخچه‌ای یافت نشد"
          description="برای این محصول هنوز تغییر قیمتی ثبت نشده."
        />
      ) : (
        <div className="flex max-h-96 flex-col gap-3 overflow-y-auto">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border border-white/[0.06] bg-ink-800/40 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-500 line-through">
                    {formatPrice(entry.oldPrice)}
                  </span>
                  <span className="text-slate-500">←</span>
                  <span className="font-bold text-white">
                    {formatPrice(entry.newPrice)}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  {formatJalaliDateTime(entry.createdAt)}
                </span>
              </div>
              {(entry.changedBy || entry.reason) && (
                <p className="m-0 mt-2 text-[11px] text-slate-500">
                  {entry.changedBy && <span>توسط {entry.changedBy}</span>}
                  {entry.changedBy && entry.reason && <span> · </span>}
                  {entry.reason}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
