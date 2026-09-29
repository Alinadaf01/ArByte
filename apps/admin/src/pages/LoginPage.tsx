import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useNavigate, type Location } from "react-router-dom";
import { adminLogin } from "@/lib/api";
import { useAdminAuth } from "@/lib/AdminAuthContext";
import { staffLoginSchema, type StaffLoginValues } from "@/lib/adminAuthSchema";
import { cn } from "@/lib/cn";

export default function LoginPage() {
  const auth = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StaffLoginValues>({ resolver: zodResolver(staffLoginSchema) });

  async function onSubmit(values: StaffLoginValues) {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const result = await adminLogin(values.phone, values.password);
      auth.login(result);
      const redirectTo =
        (location.state as { from?: Location } | null)?.from?.pathname ?? "/";
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "ورود ناموفق بود.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      >
        <div className="absolute -top-40 end-[10%] h-[28rem] w-[28rem] rounded-full bg-brand-500/[0.08] blur-[130px]" />
        <div className="absolute -bottom-40 start-[5%] size-96 rounded-full bg-brand-500/[0.05] blur-[130px]" />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <img
            src="/brand/logo-full-dark.png"
            alt="آربایت"
            className="h-28 w-auto"
          />
          <div>
            <h1 className="text-xl font-extrabold text-white">
              پنل مدیریت آربایت
            </h1>
            <p className="mt-1 text-xs text-slate-500">ورود مخصوص کارکنان</p>
          </div>
        </div>

        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="glass-card flex flex-col gap-5 p-6 sm:p-8"
        >
          <div className="flex flex-col gap-2">
            <label
              htmlFor="phone"
              className="text-xs font-semibold text-slate-300"
            >
              شماره موبایل
            </label>
            <input
              id="phone"
              dir="ltr"
              type="tel"
              inputMode="numeric"
              placeholder="09xxxxxxxxx"
              autoComplete="username"
              className={cn(
                "h-12 rounded-xl border border-white/[0.08] bg-ink-800/60 px-4 text-end font-mono text-sm text-slate-100 outline-none transition-all duration-300 placeholder:text-slate-600 focus:border-brand-500/40 focus:shadow-glow",
                errors.phone && "border-danger/60",
              )}
              {...register("phone")}
            />
            {errors.phone && (
              <p className="m-0 text-xs text-danger">{errors.phone.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="password"
              className="text-xs font-semibold text-slate-300"
            >
              رمز عبور
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className={cn(
                "h-12 rounded-xl border border-white/[0.08] bg-ink-800/60 px-4 text-sm text-slate-100 outline-none transition-all duration-300 placeholder:text-slate-600 focus:border-brand-500/40 focus:shadow-glow",
                errors.password && "border-danger/60",
              )}
              {...register("password")}
            />
            {errors.password && (
              <p className="m-0 text-xs text-danger">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 h-12 rounded-xl bg-gradient-to-l from-brand-500 to-brand-600 text-sm font-bold text-ink-950 shadow-glow transition-all duration-300 hover:shadow-glow-lg hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "در حال ورود…" : "ورود"}
          </button>

          {submitError && (
            <p
              role="alert"
              className="m-0 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger"
            >
              {submitError}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
