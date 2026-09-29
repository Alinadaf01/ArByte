import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { changeOwnPassword } from "@/lib/api";
import { useAdminAuth } from "@/lib/AdminAuthContext";
import { cn } from "@/lib/cn";

export default function ChangePasswordPage() {
  const { markPasswordChanged } = useAdminAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => changeOwnPassword(currentPassword, newPassword),
    onSuccess: () => {
      markPasswordChanged();
      navigate("/", { replace: true });
    },
    onError: (error: unknown) =>
      setFormError(
        error instanceof Error ? error.message : "تغییر رمز ناموفق بود.",
      ),
  });

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (newPassword.length < 8) {
      setFormError("رمز جدید باید حداقل ۸ کاراکتر باشد.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setFormError("تکرار رمز جدید مطابقت ندارد.");
      return;
    }
    mutation.mutate();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      >
        <div className="absolute -top-40 end-[10%] h-[28rem] w-[28rem] rounded-full bg-warning/[0.08] blur-[130px]" />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-warning to-brand-600 text-lg font-extrabold text-ink-950 shadow-glow">
            V
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-white">
              تعیین رمز جدید
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              رمز شما توسط مدیر بازنشانی شده — قبل از ادامه، رمز جدید تعیین
              کنید.
            </p>
          </div>
        </div>

        <form
          noValidate
          onSubmit={onSubmit}
          className="glass-card flex flex-col gap-5 p-6 sm:p-8"
        >
          <div className="flex flex-col gap-2">
            <label
              htmlFor="current-password"
              className="text-xs font-semibold text-slate-300"
            >
              رمز فعلی (موقت)
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={cn(
                "h-12 rounded-xl border border-white/[0.08] bg-ink-800/60 px-4 text-sm text-slate-100 outline-none transition-all duration-300 placeholder:text-slate-600 focus:border-brand-500/40 focus:shadow-glow",
              )}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="new-password"
              className="text-xs font-semibold text-slate-300"
            >
              رمز جدید
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-12 rounded-xl border border-white/[0.08] bg-ink-800/60 px-4 text-sm text-slate-100 outline-none transition-all duration-300 placeholder:text-slate-600 focus:border-brand-500/40 focus:shadow-glow"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="confirm-password"
              className="text-xs font-semibold text-slate-300"
            >
              تکرار رمز جدید
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-12 rounded-xl border border-white/[0.08] bg-ink-800/60 px-4 text-sm text-slate-100 outline-none transition-all duration-300 placeholder:text-slate-600 focus:border-brand-500/40 focus:shadow-glow"
            />
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="mt-2 h-12 rounded-xl bg-gradient-to-l from-brand-500 to-brand-600 text-sm font-bold text-ink-950 shadow-glow transition-all duration-300 hover:shadow-glow-lg hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mutation.isPending ? "در حال ذخیره…" : "تغییر رمز و ادامه"}
          </button>

          {formError && (
            <p
              role="alert"
              className="m-0 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger"
            >
              {formError}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
