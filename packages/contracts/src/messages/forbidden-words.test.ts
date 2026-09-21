import { describe, expect, it } from "vitest";
import * as admin from "./admin";
import * as auth from "./auth";
import * as cart from "./cart";
import * as common from "./common";
import * as errors from "./errors";
import * as order from "./order";
import * as product from "./product";
import { collectStrings } from "./collect-strings";
import { findForbiddenWords } from "./forbidden-words";

const ALL_MESSAGE_MODULES = {
  admin,
  auth,
  cart,
  common,
  errors,
  order,
  product,
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
