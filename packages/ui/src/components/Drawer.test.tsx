import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Drawer } from "./Drawer";
import { Button } from "./Button";

function ControlledDrawer() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>منو</Button>
      <Drawer open={open} onOpenChange={setOpen} title="منوی موبایل">
        <p>لینک‌های ناوبری</p>
      </Drawer>
    </>
  );
}

describe("Drawer", () => {
  it("باز و با Escape بسته می‌شود", async () => {
    render(<ControlledDrawer />);
    await userEvent.click(screen.getByRole("button", { name: "منو" }));
    expect(
      await screen.findByRole("dialog", { name: "منوی موبایل" }),
    ).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
