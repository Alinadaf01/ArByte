import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/lib/ToastContext";

export function ResetPasswordResultModal({
  password,
  onClose,
}: {
  password: string | null;
  onClose: () => void;
}) {
  const toast = useToast();

  async function copy() {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    toast.showSuccess("رمز عبور کپی شد.");
  }

  return (
    <Modal open={!!password} onClose={onClose} title="رمز عبور جدید">
      <div className="flex flex-col gap-4">
        <p className="m-0 rounded-xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning">
          این رمز فقط همین یک‌بار نمایش داده می‌شود — جایی ذخیره نمی‌شود و قابل
          بازیابی نیست. آن را همین حالا برای کاربر ارسال کنید.
        </p>
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-ink-800/60 px-4 py-3">
          <code className="flex-1 font-mono text-sm text-white" dir="ltr">
            {password}
          </code>
          <Button type="button" size="sm" variant="secondary" onClick={copy}>
            کپی
          </Button>
        </div>
        <p className="m-0 text-xs text-slate-500">
          کاربر با همین رمز وارد می‌شود ولی بلافاصله مجبور به تعیین رمز جدید
          خواهد بود.
        </p>
        <div className="flex justify-end">
          <Button type="button" onClick={onClose}>
            متوجه شدم
          </Button>
        </div>
      </div>
    </Modal>
  );
}
