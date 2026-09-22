import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Badge } from "./Badge";

describe("Badge", () => {
  it("متن children را نشان می‌دهد", () => {
    render(<Badge tone="success">موجود</Badge>);
    expect(screen.getByText("موجود")).toBeInTheDocument();
  });

  it("همه‌ی tone‌ها بدون خطا رندر می‌شوند", () => {
    const tones = [
      "neutral",
      "success",
      "warning",
      "info",
      "danger",
      "brand",
    ] as const;
    for (const tone of tones) {
      render(<Badge tone={tone}>{tone}</Badge>);
    }
  });
});
