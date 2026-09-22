import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("عنوان و توضیح را نشان می‌دهد", () => {
    render(
      <EmptyState
        title="سبد خرید شما خالی است."
        description="محصولی اضافه نشده."
      />,
    );
    expect(screen.getByText("سبد خرید شما خالی است.")).toBeInTheDocument();
    expect(screen.getByText("محصولی اضافه نشده.")).toBeInTheDocument();
  });

  it("action را رندر می‌کند", () => {
    render(
      <EmptyState
        title="خالی"
        action={<button type="button">رفتن به فروشگاه</button>}
      />,
    );
    expect(
      screen.getByRole("button", { name: "رفتن به فروشگاه" }),
    ).toBeInTheDocument();
  });
});
