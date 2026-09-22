import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "./Card";

describe("Card", () => {
  it("محتوا را رندر می‌کند", () => {
    render(<Card>محتوای کارت</Card>);
    expect(screen.getByText("محتوای کارت")).toBeInTheDocument();
  });

  it("هر سه نوع بدون خطا رندر می‌شوند", () => {
    const variants = ["flat", "raised", "interactive"] as const;
    for (const variant of variants) {
      render(<Card variant={variant}>{variant}</Card>);
    }
  });

  it("forwardRef عنصر div واقعی را برمی‌گرداند", () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<Card ref={ref}>متن</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
