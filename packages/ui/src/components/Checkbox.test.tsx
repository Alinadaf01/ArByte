import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "./Checkbox";

describe("Checkbox", () => {
  it("با کلیک و با کیبورد (Space) toggle می‌شود", async () => {
    render(<Checkbox label="یادآوری ایمیلی" />);
    const box = screen.getByRole("checkbox", { name: "یادآوری ایمیلی" });
    expect(box).not.toBeChecked();

    await userEvent.click(box);
    expect(box).toBeChecked();

    box.focus();
    await userEvent.keyboard(" ");
    expect(box).not.toBeChecked();
  });

  it("disabled از toggle جلوگیری می‌کند", async () => {
    render(<Checkbox label="غیرفعال" disabled />);
    const box = screen.getByRole("checkbox");
    await userEvent.click(box);
    expect(box).not.toBeChecked();
  });
});
