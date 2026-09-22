import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { VisuallyHidden } from "./VisuallyHidden";

describe("VisuallyHidden", () => {
  it("محتوا در DOM هست ولی از نظر بصری مخفی است", () => {
    render(<VisuallyHidden>متن فقط برای screen reader</VisuallyHidden>);
    expect(screen.getByText("متن فقط برای screen reader")).toBeInTheDocument();
  });
});
