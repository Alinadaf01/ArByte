import { describe, expect, it } from "vitest";
import * as admin from "./admin";
import * as auth from "./auth";
import * as cart from "./cart";
import * as common from "./common";
import * as devShowcase from "./dev-showcase";
import * as errors from "./errors";
import * as order from "./order";
import * as product from "./product";
import { ERROR_MESSAGES } from "../common/error-codes";
import { collectStrings } from "./collect-strings";
import { findForbiddenWords } from "./forbidden-words";

// توجه: فقط ERROR_MESSAGES (Record<string,string> ساده) اسکن می‌شود، نه کل
// ماژول common/error-codes — آن ماژول اسکیمای Zod هم صادر می‌کند
// (ErrorCodeSchema/ApiErrorSchema) که یک instance کلاس است، نه داده‌ی ساده؛
// عبورش از collectStrings (که Object.values بازگشتی می‌زند) بی‌فایده و
// پرخطر است (ساختار داخلی Zod، نه متن برند).
const ALL_MESSAGE_MODULES = {
  admin,
  auth,
  cart,
  common,
  devShowcase,
  errors,
  order,
  product,
  apiErrorMessages: { ERROR_MESSAGES },
};

describe("forbidden words", () => {
  it("finds a real match on a known-bad sample (sanity check)", () => {
    expect(
      findForbiddenWords("بهترین لپ‌تاپ دنیا با تخفیف باورنکردنی"),
    ).toEqual(expect.arrayContaining(["بهترین", "باورنکردنی"]));
    expect(findForbiddenWords("این محصول خوب است")).toEqual([]);
  });

  it("contains no forbidden word in any shipped message string", () => {
    const violations: string[] = [];
    for (const [moduleName, mod] of Object.entries(ALL_MESSAGE_MODULES)) {
      for (const text of collectStrings(mod)) {
        const found = findForbiddenWords(text);
        if (found.length > 0) {
          violations.push(`[${moduleName}] "${text}" -> ${found.join(", ")}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
