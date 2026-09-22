import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "./Modal";
import { Button } from "./Button";

function ControlledModal() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>باز کردن</Button>
      <Modal open={open} onOpenChange={setOpen} title="تأیید حذف">
        <p>آیا مطمئن هستید؟</p>
      </Modal>
    </>
  );
}

describe("Modal", () => {
  it("با Escape بسته می‌شود", async () => {
    render(<ControlledModal />);
    const trigger = screen.getByRole("button", { name: "باز کردن" });
    await userEvent.click(trigger);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("دکمه‌ی بستن هم مودال را می‌بندد", async () => {
    render(<ControlledModal />);
    await userEvent.click(screen.getByRole("button", { name: "باز کردن" }));
    await screen.findByRole("dialog");
    await userEvent.click(screen.getByRole("button", { name: "بستن" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // برگشت فوکوس بعد از بستن (تله‌ی فوکوس Radix) روی document.activeElement
  // واقعی تکیه دارد که jsdom کامل شبیه‌سازی نمی‌کند — قابل‌اعتماد فقط در
  // مرورگر واقعی تست می‌شود (webapp-testing زنده، T-002 §۱۷)، نه اینجا.
});
