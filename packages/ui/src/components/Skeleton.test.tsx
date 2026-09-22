import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("از دید screen reader مخفی است (aria-hidden)", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("هر سه شکل بدون خطا رندر می‌شوند", () => {
    const shapes = ["text", "circle", "rect"] as const;
    for (const shape of shapes) {
      render(<Skeleton shape={shape} />);
    }
  });
});
