import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./Input";
import { FormField } from "./FormField";

describe("Input", () => {
  it("مقدار تایپ‌شده را می‌پذیرد", async () => {
    render(<Input aria-label="نام" />);
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "علی");
    expect(input).toHaveValue("علی");
  });

  it("برای type=tel به‌صورت خودکار dir=ltr می‌گیرد", () => {
    render(<Input type="tel" aria-label="موبایل" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("dir", "ltr");
  });

  it("برای type=text عادی dir تنظیم نمی‌شود", () => {
    render(<Input aria-label="متن" />);
    expect(screen.getByRole("textbox")).not.toHaveAttribute("dir");
  });

  it("dir صریح، تشخیص خودکار را override می‌کند", () => {
    render(<Input type="tel" dir="rtl" aria-label="موبایل" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("dir", "rtl");
  });

  it("در FormField با errorText به‌صورت خودکار aria-invalid و aria-describedby می‌گیرد", () => {
    render(
      <FormField label="موبایل" errorText="شماره موبایل واردشده صحیح نیست.">
        <Input />
      </FormField>,
    );
    const input = screen.getByLabelText("موبایل");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "شماره موبایل واردشده صحیح نیست.",
    );
  });

  it("disabled کاربر را از تایپ‌کردن باز می‌دارد", async () => {
    render(<Input disabled aria-label="غیرفعال" />);
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "test");
    expect(input).toHaveValue("");
  });
});
