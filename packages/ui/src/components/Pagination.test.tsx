import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pagination } from "./Pagination";

function ControlledPagination() {
  const [page, setPage] = useState(1);
  return (
    <Pagination
      page={page}
      totalPages={3}
      onPageChange={setPage}
      previousLabel="صفحه‌ی قبلی"
      nextLabel="صفحه‌ی بعدی"
    />
  );
}

describe("Pagination", () => {
  it("شماره‌ها با ارقام فارسی نمایش داده می‌شوند و صفحه‌ی فعلی aria-current دارد", () => {
    render(<ControlledPagination />);
    const current = screen.getByRole("button", { name: "۱" });
    expect(current).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "۲" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "۳" })).toBeInTheDocument();
  });

  it("دکمه‌ی «قبلی» در صفحه‌ی اول غیرفعال است", () => {
    render(<ControlledPagination />);
    expect(screen.getByRole("button", { name: "صفحه‌ی قبلی" })).toBeDisabled();
  });

  it("کلیک روی شماره‌ی صفحه، صفحه را عوض می‌کند", async () => {
    render(<ControlledPagination />);
    await userEvent.click(screen.getByRole("button", { name: "۲" }));
    expect(screen.getByRole("button", { name: "۲" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
