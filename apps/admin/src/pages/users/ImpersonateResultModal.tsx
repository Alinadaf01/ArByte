import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import type { ImpersonateResponse } from "@/types/accountAdmin";

export function ImpersonateResultModal({
  result,
  userPhone,
  onClose,
}: {
  result: ImpersonateResponse | null;
  userPhone: string;
  onClose: () => void;
}) {
  return (
    <Modal
      open={!!result}
      onClose={onClose}
      title={`نشست پشتیبانی برای ${userPhone}`}
      widthClass="max-w-xl"
    >
      <div className="flex flex-col gap-4">
        <p className="m-0 rounded-xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning">
          این عملیات در گزارش فعالیت ثبت شد. لینک زیر فقط تا{" "}
          {result?.expiresInSeconds ?? 60} ثانیه و فقط یک‌بار قابل استفاده است —
          بعد از آن یا بعد از اولین استفاده، از کار می‌افتد.
        </p>
        {result && (
          <a
            href={result.url}
            target="_blank"
            rel="noreferrer"
            className="block truncate rounded-xl border border-white/10 bg-ink-800/60 px-4 py-3 font-mono text-xs text-brand-400 underline"
            dir="ltr"
          >
            {result.url}
          </a>
        )}
        <p className="m-0 text-xs text-slate-500">
          نشست پشتیبانی حداکثر ۳۰ دقیقه فعال می‌ماند و امکان ثبت سفارش یا حذف
          آدرس را ندارد — فقط برای بازتولید مشکل گزارش‌شده است.
        </p>
        <div className="flex justify-end">
          <Button type="button" onClick={onClose}>
            بستن
          </Button>
        </div>
      </div>
    </Modal>
  );
}
