import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Tooltip } from "./Tooltip";

describe("Tooltip", () => {
  it("با فوکوس روی trigger محتوا بعد از تأخیر ظاهر می‌شود", async () => {
    render(
      <Tooltip content="افزودن به علاقه‌مندی‌ها" delayMs={0}>
        <button type="button">♡</button>
      </Tooltip>,
    );
    const trigger = screen.getByRole("button");
    trigger.focus();
    expect(
      await screen.findByText("افزودن به علاقه‌مندی‌ها"),
    ).toBeInTheDocument();
  });
});
