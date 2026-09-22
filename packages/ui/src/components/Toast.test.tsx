import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Toast } from "./Toast";

function ControlledToast({ durationMs }: { durationMs?: number }) {
  const [open, setOpen] = useState(true);
  return (
    <Toast open={open} onOpenChange={setOpen} durationMs={durationMs}>
      ۲ دستگاه به سبد اضافه شد
    </Toast>
  );
}

describe("Toast", () => {
  it("role=status و aria-live=polite دارد", () => {
    render(<ControlledToast durationMs={undefined} />);
    const toast = screen.getByRole("status");
    expect(toast).toHaveAttribute("aria-live", "polite");
    expect(toast).toHaveTextContent("۲ دستگاه به سبد اضافه شد");
  });

  it("وقتی open=false چیزی رندر نمی‌شود", () => {
    render(
      <Toast open={false} onOpenChange={() => {}}>
        متن
      </Toast>,
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("بعد از durationMs خودکار بسته می‌شود", async () => {
    vi.useFakeTimers();
    render(<ControlledToast durationMs={100} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    vi.advanceTimersByTime(150);
    vi.useRealTimers();
    await waitFor(() =>
      expect(screen.queryByRole("status")).not.toBeInTheDocument(),
    );
  });
});
