import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Switch } from "./Switch";

describe("Switch", () => {
  it("role=switch دارد و toggle می‌شود", async () => {
    render(<Switch label="اعلان پیامکی" />);
    const sw = screen.getByRole("switch", { name: "اعلان پیامکی" });
    expect(sw).not.toBeChecked();
    await userEvent.click(sw);
    expect(sw).toBeChecked();
  });
});
