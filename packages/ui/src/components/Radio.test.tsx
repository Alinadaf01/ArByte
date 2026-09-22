import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Radio } from "./Radio";

describe("Radio", () => {
  it("در یک گروه فقط یکی انتخاب می‌ماند", async () => {
    render(
      <>
        <Radio name="ship" value="a" label="پست پیشتاز" />
        <Radio name="ship" value="b" label="اسنپ‌باکس" />
      </>,
    );
    const a = screen.getByRole("radio", { name: "پست پیشتاز" });
    const b = screen.getByRole("radio", { name: "اسنپ‌باکس" });

    await userEvent.click(a);
    expect(a).toBeChecked();
    expect(b).not.toBeChecked();

    await userEvent.click(b);
    expect(b).toBeChecked();
    expect(a).not.toBeChecked();
  });
});
