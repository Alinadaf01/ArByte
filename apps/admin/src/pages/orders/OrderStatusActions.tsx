import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { transitionOrder } from "@/lib/api";
import { useToast } from "@/lib/ToastContext";
import { statusLabel, type AdminOrder, type OrderStatus } from "@/types/order";

/** F-01 §۳ — فقط گذارهایی که سرور برای این وضعیت مجاز می‌داند
 * (`allowedTransitions`، همان جدول مشترک order_status.py)، هر کدام با یادداشت. */
export function OrderStatusActions({ order }: { order: AdminOrder }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [target, setTarget] = useState<OrderStatus | null>(null);
  const [note, setNote] = useState("");
  const [provider, setProvider] = useState(order.shipment?.provider ?? "");
  const [trackingNumber, setTrackingNumber] = useState(
    order.shipment?.trackingNumber ?? "",
  );

  const mutation = useMutation({
    mutationFn: (to: OrderStatus) =>
      transitionOrder(order.id, {
        to,
        note,
        ...(to === "SHIPPED" ? { provider, trackingNumber } : {}),
      }),
    onSuccess: (_data, to) => {
      queryClient.invalidateQueries({ queryKey: ["order", order.id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.showSuccess(`وضعیت به «${statusLabel(to)}» تغییر کرد.`);
      setTarget(null);
      setNote("");
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "تغییر وضعیت ناموفق بود.",
      ),
  });

  if (order.allowedTransitions.length === 0) return null;

  const blockedBySerial = (to: OrderStatus) =>
    to === "READY_TO_SHIP" && order.missingSerialItemIds.length > 0;
  const shipInvalid =
    target === "SHIPPED" && (!provider.trim() || !trackingNumber.trim());

  return (
    <section className="glass-card flex flex-col gap-3 p-5">
      <h2 className="m-0 text-sm font-bold text-white">تغییر وضعیت</h2>
      <div className="flex flex-wrap items-center gap-3">
        {order.allowedTransitions.map((to) => (
          <Button
            key={to}
            size="sm"
            variant={to === "CANCELLED" ? "danger" : "primary"}
            disabled={blockedBySerial(to)}
            title={
              blockedBySerial(to)
                ? "ابتدا سریال همه‌ی واحدها را ثبت کنید."
                : undefined
            }
            onClick={() => setTarget(to)}
          >
            {to === "CANCELLED" ? "لغو سفارش" : `← ${statusLabel(to)}`}
          </Button>
        ))}
      </div>
      {order.allowedTransitions.includes("READY_TO_SHIP") &&
        order.missingSerialItemIds.length > 0 && (
          <p className="m-0 text-xs text-warning">
            برای «آماده‌ی ارسال»، سریال همه‌ی واحدها باید ثبت شود.
          </p>
        )}

      <Modal
        open={target !== null}
        onClose={() => setTarget(null)}
        title={target ? `تغییر به «${statusLabel(target)}»` : ""}
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (target && !shipInvalid) mutation.mutate(target);
          }}
        >
          {target === "SHIPPED" && (
            <>
              <Field label="شرکت ارسال" htmlFor="ship-provider">
                <Input
                  id="ship-provider"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  placeholder="مثلاً پست پیشتاز"
                />
              </Field>
              <Field
                label="کد رهگیری"
                htmlFor="ship-tracking"
                hint="با ثبت ارسال، پیامک کد رهگیری برای مشتری ارسال می‌شود."
              >
                <Input
                  id="ship-tracking"
                  dir="ltr"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                />
              </Field>
            </>
          )}
          <Field
            label={target === "CANCELLED" ? "دلیل لغو" : "یادداشت (اختیاری)"}
            htmlFor="transition-note"
          >
            <Textarea
              id="transition-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setTarget(null)}
            >
              انصراف
            </Button>
            <Button
              type="submit"
              size="sm"
              variant={target === "CANCELLED" ? "danger" : "primary"}
              disabled={
                mutation.isPending ||
                shipInvalid ||
                (target === "CANCELLED" && !note.trim())
              }
            >
              {mutation.isPending ? "در حال ثبت…" : "تأیید"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
