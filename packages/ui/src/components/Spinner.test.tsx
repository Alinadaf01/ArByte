import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("بدون label نقش status ندارد (برای استفاده‌ی داخل Button)", () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector('[role="status"]')).not.toBeInTheDocument();
  });

  it("با label نقش status و متن برای screen reader دارد", () => {
    render(<Spinner label="در حال بارگذاری" />);
    expect(screen.getByRole("status")).toHaveTextContent("در حال بارگذاری");
  });
});
