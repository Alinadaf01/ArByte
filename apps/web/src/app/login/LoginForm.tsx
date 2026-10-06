"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { loginPage, normalizeDigits, toPersianDigits } from "@arbyte/contracts";
import { Logo } from "@/components/shell/Logo";
import { cartStore } from "@/lib/stores/cart-store";
import { wishlistStore } from "@/lib/stores/wishlist-store";
import { CART_SESSION_STORAGE_KEY } from "@/lib/cart-api";

type Step = "phone" | "otp" | "done";
const OTP_LENGTH = 4;
const RESEND_WINDOW_FALLBACK_SECONDS = 120;

function onlyDigits(value: string): string {
  return normalizeDigits(value).replace(/\D/g, "");
}

function maskedPhone(phoneDigits: string): string {
  if (phoneDigits.length < 10) return "";
  return (
    "۰" +
    toPersianDigits(phoneDigits.slice(0, 3)) +
    " ••• ••" +
    toPersianDigits(phoneDigits.slice(8))
  );
}

function formatMmSs(totalSeconds: number): string {
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return toPersianDigits(`${mm}:${ss}`);
}

/** پس‌زمینه‌ی متحرک — کیف‌فریم‌های arb-login-* محلی همین صفحه‌اند (طبق
 * یادداشت packages/tokens/index.css: «فقط مال یک صفحه‌اند، اینجا تعریف
 * نشوند»)، بدون هیچ HEX خام — فقط color-mix روی توکن‌های brand/accent. */
function LoginBackground({ done }: { done: boolean }) {
  const violet = "var(--color-brand)";
  const violetOnDark = "var(--color-brand-on-dark)";
  const cyan = "var(--color-accent)";
  const cyanDeep = "var(--color-accent-deep)";
  const orb1 = done ? cyan : violet;
  const orb2 = done ? cyanDeep : "var(--color-brand-active)";
  const orb3 = done ? cyan : violetOnDark;
  const gridColor = done ? cyan : violet;

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <style>{`
        @keyframes arb-login-orb-1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(30px,-40px) scale(1.08)}66%{transform:translate(-20px,20px) scale(.95)}}
        @keyframes arb-login-orb-2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-35px,35px) scale(1.12)}}
        @keyframes arb-login-orb-3{0%,100%{transform:translate(-50%,-50%) scale(1.05)}40%{transform:translate(calc(-50% + 25px),calc(-50% + 30px)) scale(.9)}80%{transform:translate(calc(-50% - 30px),calc(-50% - 25px)) scale(1.1)}}
        @keyframes arb-login-mesh{0%,100%{opacity:.55}50%{opacity:.85}}
      `}</style>
      <div
        className="absolute inset-0 transition-[background] duration-700"
        style={{
          background: `radial-gradient(ellipse 90% 70% at 15% 20%, color-mix(in srgb, ${orb1} 20%, transparent), transparent 55%), radial-gradient(ellipse 70% 55% at 85% 75%, color-mix(in srgb, ${orb2} 18%, transparent), transparent 50%)`,
          animation: "arb-login-mesh 14s ease-in-out infinite",
        }}
      />
      <span
        className="absolute end-0 top-[5%] block h-[300px] w-[300px] rounded-full blur-[70px] transition-[background] duration-700"
        style={{
          background: `color-mix(in srgb, ${orb1} 40%, transparent)`,
          animation: "arb-login-orb-1 18s ease-in-out infinite",
        }}
      />
      <span
        className="absolute bottom-[10%] start-[5%] block h-[240px] w-[240px] rounded-full blur-[70px] transition-[background] duration-700"
        style={{
          background: `color-mix(in srgb, ${orb2} 32%, transparent)`,
          animation: "arb-login-orb-2 22s ease-in-out infinite",
        }}
      />
      <span
        className="absolute start-1/2 top-1/2 block h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[70px] transition-[background] duration-700"
        style={{
          background: `color-mix(in srgb, ${orb3} 22%, transparent)`,
          animation: "arb-login-orb-3 16s ease-in-out infinite",
        }}
      />
      <span
        className="absolute inset-0 block opacity-50 transition-[background-image] duration-700"
        style={{
          backgroundImage: `linear-gradient(color-mix(in srgb, ${gridColor} 5.5%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, ${gridColor} 5.5%, transparent) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />
    </div>
  );
}

/** هر خانه یک `<input>` واقعی است (نه کادر نمایشی + یک input پنهان روی همه):
 * خانه‌ی اول فوکوس/تایپ/کلیک مستقیم دارد و با `autoComplete="one-time-code"`
 * پر خودکار مرورگر (که معمولاً کل کد را یک‌جا در همان خانه‌ی اول می‌ریزد) را
 * هم می‌پذیرد و بین خانه‌ها پخش می‌کند. الگوی قبلی (کادرهای span نمایشی +
 * یک input شفاف روی کل عرض) روی ویندوز کلیک را به input پنهان نمی‌رساند و
 * روی موبایل هنگام پر شدن خودکار یک جعبه‌ی سفید خالی از رندر مرورگر روی
 * صفحه می‌ماند — هر دو با input واقعی در هر خانه از بین می‌روند. */
function OtpBoxes({
  code,
  hasError,
  shakeKey,
  length,
  onCodeChange,
}: {
  code: string;
  hasError: boolean;
  shakeKey: number;
  length: number;
  onCodeChange: (code: string) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => code[i] ?? "");

  function commit(nextDigits: string[]) {
    onCodeChange(nextDigits.join("").replace(/\s+$/, "").slice(0, length));
  }

  function handleChange(index: number, raw: string) {
    const value = onlyDigits(raw);
    if (!value) return;
    if (value.length > 1) {
      // پر خودکار مرورگر/جای‌گذاری کل کد در یک خانه — بین خانه‌ها پخش می‌شود.
      const spread = value.slice(0, length);
      commit(spread.split(""));
      refs.current[Math.min(spread.length, length) - 1]?.focus();
      return;
    }
    const next = digits.slice();
    next[index] = value;
    commit(next);
    if (index < length - 1) refs.current[index + 1]?.focus();
  }

  function handleKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      e.preventDefault();
      const next = digits.slice();
      next[index - 1] = "";
      commit(next);
      refs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const value = onlyDigits(e.clipboardData.getData("text")).slice(0, length);
    if (!value) return;
    e.preventDefault();
    commit(value.split(""));
    refs.current[Math.min(value.length, length) - 1]?.focus();
  }

  return (
    <div
      dir="ltr"
      key={shakeKey}
      role="group"
      aria-label={loginPage.otpAriaLabel}
      className={`grid grid-cols-4 gap-2.5 ${hasError ? (shakeKey % 2 ? "animate-shake" : "animate-shake-b") : ""}`}
    >
      {digits.map((digit, i) => {
        const filled = digit !== "";
        const active =
          digits.slice(0, i).every(Boolean) && !filled && !hasError;
        return (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={i === 0 ? length : 1}
            aria-label={`رقم ${toPersianDigits(String(i + 1))} کد تایید`}
            value={filled ? toPersianDigits(digit) : ""}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            className={`flex min-h-[62px] w-full items-center justify-center rounded-tile border-2 text-center text-[25px] font-bold outline-none transition-all duration-200 ${
              hasError
                ? "border-danger bg-danger-tint text-danger"
                : filled
                  ? // bg-brand-tint-2 یک رنگ کم‌رنگ تقریباً سفید است (برای کارت‌های
                    // روشن طراحی شده)؛ روی این کارت تیره با text-on-dark سفید
                    // عملاً ناخوانا می‌شد و کادر «سفید» به نظر می‌رسید.
                    "border-brand/75 bg-white/10 text-on-dark"
                  : active
                    ? "border-brand bg-white/4 text-on-dark shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-brand)_30%,transparent),0_0_24px_color-mix(in_srgb,var(--color-brand)_25%,transparent)]"
                    : "border-border-done/30 bg-white/4 text-on-dark"
            }`}
          />
        );
      })}
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [step, setStep] = useState<Step>("phone");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(
    RESEND_WINDOW_FALLBACK_SECONDS,
  );
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpAbortRef = useRef<AbortController | null>(null);

  const fullMobile = "0" + phoneDigits;
  const canSend = phoneDigits.length === 10;

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const startTimer = useCallback(
    (seconds: number) => {
      stopTimer();
      setSecondsLeft(seconds);
      timerRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            stopTimer();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    },
    [stopTimer],
  );

  useEffect(() => stopTimer, [stopTimer]);

  // Web OTP API — پیامک با خط آخر «@arbyte.ir #1234» (متن پیامک E-03).
  useEffect(() => {
    if (step !== "otp") return;
    if (!("OTPCredential" in window)) return;
    const controller = new AbortController();
    otpAbortRef.current = controller;
    navigator.credentials
      .get({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Web OTP API هنوز در lib.dom.d.ts رسمی نیست
        otp: { transport: ["sms"] } as any,
        signal: controller.signal,
      } as CredentialRequestOptions)
      .then((cred) => {
        const otp = cred as unknown as { code?: string } | null;
        if (otp?.code) setCode(onlyDigits(otp.code).slice(0, OTP_LENGTH));
      })
      .catch(() => {
        // کاربر لغو کرد یا مرورگر پشتیبانی نمی‌کند — چیزی نمایش داده نمی‌شود.
      });
    return () => controller.abort();
  }, [step]);

  async function handleSend() {
    if (!canSend || sending) return;
    setSending(true);
    setPhoneError(null);
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: fullMobile }),
      });
      const body = (await res.json()) as {
        data?: { expiresInSeconds: number };
        message?: string;
      };
      if (!res.ok) {
        setPhoneError(body.message ?? "ارسال کد ناموفق بود.");
        return;
      }
      setStep("otp");
      setCode("");
      setHasError(false);
      startTimer(body.data?.expiresInSeconds ?? RESEND_WINDOW_FALLBACK_SECONDS);
    } finally {
      setSending(false);
    }
  }

  async function handleVerify() {
    if (code.length < OTP_LENGTH || busy) return;
    setBusy(true);
    let sessionKey: string | null = null;
    try {
      sessionKey = window.localStorage.getItem(CART_SESSION_STORAGE_KEY);
    } catch {
      sessionKey = null;
    }

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: fullMobile,
          code,
          cartSessionKey: sessionKey ?? undefined,
        }),
      });
      if (!res.ok) {
        setHasError(true);
        setShakeKey((k) => k + 1);
        setCode("");
        return;
      }

      try {
        window.localStorage.removeItem(CART_SESSION_STORAGE_KEY);
      } catch {
        // بی‌ضرر — دفعه‌ی بعد سرور یک سشن مهمان تازه می‌سازد.
      }
      stopTimer();
      await Promise.all([cartStore.refresh(), wishlistStore.syncAfterLogin()]);
      setStep("done");
    } finally {
      setBusy(false);
    }
  }

  async function handleResend() {
    if (secondsLeft > 0 || sending) return;
    await handleSend();
  }

  function handleEdit() {
    stopTimer();
    otpAbortRef.current?.abort();
    setStep("phone");
    setCode("");
    setHasError(false);
  }

  function handleBackToPhone() {
    stopTimer();
    setStep("phone");
    setPhoneDigits("");
    setCode("");
    setHasError(false);
  }

  const done = step === "done";
  const masked = maskedPhone(phoneDigits);

  return (
    <div
      dir="rtl"
      className="bg-login-canvas text-on-dark relative flex min-h-dvh items-center justify-center overflow-hidden px-[5vw] py-14 font-sans"
    >
      <LoginBackground done={done} />

      <main className="relative z-10 flex w-full max-w-[452px] flex-col gap-4.5">
        <Link
          href="/"
          aria-label={loginPage.logoHomeLabel}
          className="flex items-center justify-center gap-2.5"
        >
          <Logo
            variant="full-dark"
            alt={loginPage.logoHomeLabel}
            className="h-16"
            priority
          />
        </Link>

        <article
          className={`animate-step-in rounded-card-lg border p-[clamp(22px,4vw,34px)] backdrop-blur-lg transition-[background-color,border-color] duration-500 ${
            done
              ? "bg-[color-mix(in_srgb,var(--color-accent-deep)_14%,black_86%)] border-accent/50"
              : "border-border-done/40 bg-white/6"
          }`}
        >
          {step !== "done" ? (
            <div className="flex flex-col gap-5.5">
              <div className="flex justify-center">
                <span className="border-brand/32 bg-brand/12 animate-pulse flex h-14.5 w-14.5 items-center justify-center rounded-tile border">
                  <svg
                    width="27"
                    height="27"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-brand-on-dark)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    {step === "phone" ? (
                      <path d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75M6.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    ) : (
                      <path d="M3 7.5h18v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5ZM3.4 8.2l8.6 6.1 8.6-6.1" />
                    )}
                  </svg>
                </span>
              </div>

              <header className="flex flex-col gap-2 text-center">
                <h1 className="text-on-dark m-0 text-[clamp(21px,2.6vw,28px)] font-bold tracking-tight">
                  {step === "phone"
                    ? loginPage.title.phone
                    : loginPage.title.otp}
                </h1>
                <p className="text-on-dark-secondary m-0 text-body leading-loose">
                  {step === "phone"
                    ? loginPage.subtitle.phone
                    : loginPage.subtitle.otp(
                        toPersianDigits(String(OTP_LENGTH)),
                      )}
                </p>
                {step === "otp" ? (
                  <p
                    dir="ltr"
                    className="text-on-dark-secondary m-0 min-h-[19px] text-caption font-semibold tracking-wider"
                  >
                    {masked}
                  </p>
                ) : null}
              </header>

              {step === "phone" ? (
                <form
                  className="flex flex-col gap-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                >
                  <div
                    dir="ltr"
                    className={`grid grid-cols-[auto_minmax(0,1fr)] items-center overflow-hidden rounded-tile border-[1.5px] transition-all duration-200 ${
                      canSend
                        ? "border-brand/70 bg-brand/10"
                        : "border-border-done/30 bg-white/4"
                    }`}
                  >
                    <span className="border-border-done/20 text-on-dark-secondary border-e px-4 text-body font-semibold leading-14">
                      {loginPage.phonePrefix}
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      aria-label={loginPage.phoneAriaLabel}
                      value={phoneDigits}
                      onChange={(e) =>
                        setPhoneDigits(onlyDigits(e.target.value).slice(0, 10))
                      }
                      placeholder={loginPage.phonePlaceholder}
                      maxLength={10}
                      // text-body روی موبایل ۱۵px می‌شود؛ هر input زیر ۱۶px روی
                      // iOS Safari با فوکوس خودکار زوم می‌کند (و چون RTL است
                      // انگار صفحه به راست کشیده می‌شود). ۱۶px ثابت جلوش را می‌گیرد.
                      className="text-on-dark min-h-14 min-w-0 border-0 bg-transparent px-4 text-start text-[16px] font-semibold tracking-wide outline-none"
                    />
                  </div>
                  {phoneError ? (
                    <p
                      role="alert"
                      className="text-danger m-0 text-center text-caption"
                    >
                      {phoneError}
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={!canSend || sending}
                    className={`min-h-13.5 rounded-tile text-body font-semibold transition-all duration-200 ${
                      canSend
                        ? "bg-brand shadow-button-accent text-on-dark cursor-pointer"
                        : "text-on-dark-tertiary cursor-not-allowed bg-white/6"
                    }`}
                  >
                    {loginPage.sendCodeCta}
                  </button>
                  <p className="text-on-dark-secondary m-0 text-center text-caption leading-loose">
                    {loginPage.otpHelperNote}
                  </p>
                </form>
              ) : (
                <form
                  className="animate-step-in flex flex-col gap-4.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleVerify();
                  }}
                >
                  <OtpBoxes
                    code={code}
                    hasError={hasError}
                    shakeKey={shakeKey}
                    length={OTP_LENGTH}
                    onCodeChange={(next) => {
                      setCode(next);
                      setHasError(false);
                    }}
                  />

                  <p
                    role="alert"
                    aria-live="polite"
                    className={`text-danger m-0 min-h-5 text-center text-caption transition-opacity duration-200 ${hasError ? "opacity-100" : "opacity-0"}`}
                  >
                    {loginPage.otpErrorNote}
                  </p>

                  <button
                    type="submit"
                    disabled={code.length < OTP_LENGTH || busy}
                    className={`flex min-h-13.5 items-center justify-center gap-2.5 rounded-tile text-body font-semibold transition-all duration-200 ${
                      code.length === OTP_LENGTH
                        ? "bg-brand shadow-button-accent text-on-dark cursor-pointer"
                        : "text-on-dark-tertiary cursor-not-allowed bg-white/6"
                    }`}
                  >
                    {busy ? (
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="animate-spin"
                        aria-hidden="true"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          opacity=".25"
                        />
                        <path
                          d="M12 2a10 10 0 0 1 10 10"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    ) : null}
                    {busy ? loginPage.verifyCta.busy : loginPage.verifyCta.idle}
                  </button>

                  <div className="flex flex-col items-center gap-1.5">
                    <p className="text-on-dark-secondary m-0 text-[13.5px]">
                      {loginPage.resendPrompt}{" "}
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={secondsLeft > 0}
                        className={`min-h-6 border-0 bg-transparent px-1 font-semibold ${
                          secondsLeft > 0
                            ? "text-on-dark-secondary/55 cursor-not-allowed"
                            : "text-brand-on-dark-alt cursor-pointer"
                        }`}
                      >
                        {loginPage.resendCta}
                      </button>
                    </p>
                    <p className="text-on-dark-secondary m-0 text-caption">
                      {secondsLeft > 0
                        ? loginPage.resendTimer(formatMmSs(secondsLeft))
                        : loginPage.resendReady}
                    </p>
                    <button
                      type="button"
                      onClick={handleEdit}
                      className="text-on-dark-secondary hover:text-on-dark mt-1 min-h-10 rounded-[11px] border-0 bg-transparent px-3.5 text-caption font-semibold transition-colors duration-200"
                    >
                      {loginPage.editNumberCta}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="animate-step-in flex flex-col items-center gap-0 text-center">
              <div className="relative mb-5.5 flex h-24 w-24 items-center justify-center">
                <span className="border-accent/40 absolute inset-0 animate-ping rounded-full border-2" />
                <span className="border-accent shadow-[0_0_40px_color-mix(in_srgb,var(--color-accent)_35%,transparent)] bg-accent/14 animate-pop relative flex h-20 w-20 items-center justify-center rounded-full border-2">
                  <svg
                    width="46"
                    height="46"
                    viewBox="0 0 52 52"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="26"
                      cy="26"
                      r="25"
                      fill="none"
                      stroke="color-mix(in srgb, var(--color-accent) 30%, transparent)"
                      strokeWidth="2"
                    />
                    <path
                      d="M14 27l7 7 16-16"
                      fill="none"
                      stroke="var(--color-accent)"
                      strokeWidth="3.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
              <h2 className="text-accent m-0 mb-2 text-[clamp(21px,2.6vw,28px)] font-bold tracking-tight">
                {loginPage.success.title}
              </h2>
              <p className="text-on-dark-secondary m-0 mb-1 text-[14.5px]">
                {loginPage.success.body}
              </p>
              <p className="text-accent/75 m-0 mb-7 text-caption">
                {loginPage.success.maskedNote(masked)}
              </p>
              <div className="flex w-full flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => router.push(next)}
                  className="bg-gradient-to-br from-accent to-accent-deep text-accent-badge-ink shadow-[0_10px_32px_color-mix(in_srgb,var(--color-accent)_30%,transparent)] flex min-h-13 items-center justify-center rounded-tile text-body font-bold"
                >
                  {loginPage.success.continueCta}
                </button>
                <button
                  type="button"
                  onClick={handleBackToPhone}
                  className="border-border-done/20 text-on-dark-secondary min-h-12 rounded-tile border bg-white/4 text-[14.5px] font-medium"
                >
                  {loginPage.success.otherNumberCta}
                </button>
              </div>
            </div>
          )}
        </article>

        <p className="text-on-dark-tertiary m-0 text-center text-caption leading-loose">
          {loginPage.legalPrefix}{" "}
          <Link href="/legal">{loginPage.legalTermsLink}</Link>{" "}
          {loginPage.legalConnector}{" "}
          <Link href="/legal">{loginPage.legalPrivacyLink}</Link>{" "}
          {loginPage.legalSuffix}
        </p>
      </main>
    </div>
  );
}
