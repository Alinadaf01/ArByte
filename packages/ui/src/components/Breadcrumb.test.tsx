import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Breadcrumb } from "./Breadcrumb";

describe("Breadcrumb", () => {
  it("آخرین آیتم aria-current=page دارد و لینک نیست", () => {
    render(
      <Breadcrumb
        items={[
          { label: "خانه", href: "/" },
          { label: "لپ‌تاپ", href: "/laptop" },
          { label: "MSI Titan 18 HX" },
        ]}
      />,
    );
    const current = screen.getByText("MSI Titan 18 HX");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(current.tagName).not.toBe("A");
    expect(screen.getByRole("link", { name: "خانه" })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
