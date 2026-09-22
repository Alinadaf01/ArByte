import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./Button";

describe("Button", () => {
  it("رویداد کلیک را فراخوانی می‌کند", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>ثبت سفارش</Button>);
    await userEvent.click(screen.getByRole("button", { name: "ثبت سفارش" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("در حالت loading غیرفعال می‌شود و متن جایگزین نشان می‌دهد", () => {
    render(
      <Button loading loadingText="در حال ثبت...">
        ثبت سفارش
      </Button>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("در حال ثبت...")).toBeInTheDocument();
    expect(screen.queryByText("ثبت سفارش")).not.toBeInTheDocument();
  });

  it("disabled صریح هم کلیک را مسدود می‌کند", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        غیرفعال
      </Button>,
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("هر ۵ نوع بدون خطا رندر می‌شوند", () => {
    const variants = [
      "primary",
      "secondary",
      "outline",
      "ghost",
      "destructive",
    ] as const;
    for (const variant of variants) {
      render(<Button variant={variant}>{variant}</Button>);
    }
    for (const variant of variants) {
      expect(screen.getAllByText(variant).length).toBeGreaterThan(0);
    }
  });

  it("آیکون را طبق iconPosition قبل یا بعد از متن می‌گذارد", () => {
    const { container: startContainer } = render(
      <Button icon={<span data-testid="icon">*</span>} iconPosition="start">
        متن
      </Button>,
    );
    const startBtn = startContainer.querySelector("button")!;
    expect(startBtn.firstElementChild).toHaveAttribute("data-testid", "icon");

    const { container: endContainer } = render(
      <Button icon={<span data-testid="icon">*</span>} iconPosition="end">
        متن
      </Button>,
    );
    const endBtn = endContainer.querySelector("button")!;
    expect(endBtn.lastElementChild).toHaveAttribute("data-testid", "icon");
  });

  it("forwardRef عنصر button واقعی را برمی‌گرداند", () => {
    const ref = { current: null as HTMLButtonElement | null };
    render(<Button ref={ref}>متن</Button>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
