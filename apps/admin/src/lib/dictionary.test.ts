import { describe, expect, it } from "vitest";
import { dictionary } from "./dictionary";

describe("dictionary", () => {
  it("exposes the home strings", () => {
    expect(dictionary.home.title).toBe("پنل مدیریت آربایت");
  });
});
