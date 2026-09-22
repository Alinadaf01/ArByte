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
import { findHalfSpaceIssues } from "./half-space";

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

describe("half-space (نیم‌فاصله)", () => {
  it("detects a known-bad sample (sanity check)", () => {
    expect(findHalfSpaceIssues("این عملیات با موفقیت انجام می شود.")).toEqual([
      { wrong: "می شود", correct: "می‌شود" },
    ]);
    expect(findHalfSpaceIssues("این عملیات با موفقیت انجام می‌شود.")).toEqual(
      [],
    );
  });

  it("has no half-space mistakes in any shipped message string", () => {
    const violations: string[] = [];
    for (const [moduleName, mod] of Object.entries(ALL_MESSAGE_MODULES)) {
      for (const text of collectStrings(mod)) {
        const found = findHalfSpaceIssues(text);
        if (found.length > 0) {
          violations.push(
            `[${moduleName}] "${text}" -> ${found.map((f) => f.wrong).join(", ")}`,
          );
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
