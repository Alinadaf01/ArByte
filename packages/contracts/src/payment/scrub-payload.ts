/**
 * الحاقیه T-004 §۷ — پاک‌سازی `Payment.providerPayload` پیش از ذخیره.
 *
 * حذف: شماره کارت کامل، CVV/CVV2، توکن، هر هدر احراز هویت (Authorization،
 * رمز/secret عمومی).
 * نگه‌داری: شناسه تراکنش، مبلغ، زمان، کد وضعیت، **چهار رقم آخر کارت**
 * (نه کل شماره) — برای همین شماره‌ی کارت به‌جای حذف ساده، به `cardLast4`
 * تبدیل می‌شود.
 *
 * بازگشتی است — پاسخ درگاه ممکن است تودرتو باشد (مثلاً `{ card: { number,
 * cvv } }`). ⚠️ داخل یک آبجکت که خودش `card`/`pan` نام دارد، کلید کوتاه
 * `number`/`no` هم شماره‌ی کارت است — بدون آگاهی از این «زمینه»، فقط با
 * regex روی نام کلید نمی‌شود این حالت تودرتو را گرفت (کلمه‌ی «number»
 * به‌تنهایی برای false-positive روی چیزهایی مثل orderNumber خیلی عمومی است).
 */

const SENSITIVE_KEY_PATTERNS = [
  /cvv2?/i,
  /cvc/i,
  /token/i,
  /authorization/i,
  /auth[-_]?header/i,
  /password/i,
  /secret/i,
  /pin/i,
];

const CARD_NUMBER_KEY_PATTERNS = [
  /card[-_]?number/i,
  /^pan$/i,
  /card[-_]?no$/i,
];
const CARD_CONTEXT_KEY_PATTERNS = [/^card$/i, /^pan$/i];
const CARD_NUMBER_KEY_IN_CONTEXT_PATTERNS = [/^number$/i, /^no$/i];

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function isCardNumberKey(key: string, insideCardContext: boolean): boolean {
  if (CARD_NUMBER_KEY_PATTERNS.some((pattern) => pattern.test(key)))
    return true;
  return (
    insideCardContext &&
    CARD_NUMBER_KEY_IN_CONTEXT_PATTERNS.some((p) => p.test(key))
  );
}

function lastFourDigits(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const digitsOnly = String(value).replace(/\D/g, "");
  if (digitsOnly.length < 4) return undefined;
  return digitsOnly.slice(-4);
}

function scrub(payload: unknown, insideCardContext: boolean): unknown {
  if (Array.isArray(payload)) {
    return payload.map((item) => scrub(item, insideCardContext));
  }

  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(
    payload as Record<string, unknown>,
  )) {
    if (isCardNumberKey(key, insideCardContext)) {
      const last4 = lastFourDigits(value);
      if (last4) result["cardLast4"] = last4;
      continue;
    }
    if (isSensitiveKey(key)) {
      continue;
    }
    if (value && typeof value === "object") {
      const childIsCardContext = CARD_CONTEXT_KEY_PATTERNS.some((pattern) =>
        pattern.test(key),
      );
      result[key] = scrub(value, childIsCardContext);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function scrubPayload(payload: unknown): unknown {
  return scrub(payload, false);
}
