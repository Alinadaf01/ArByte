import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select, type SelectOption } from "./Select";

const FEW_OPTIONS: SelectOption[] = [
  { value: "gaming", label: "گیمینگ" },
  { value: "pro", label: "حرفه‌ای" },
  { value: "ultrabook", label: "اولترابوک" },
];

function ControlledSingle() {
  const [value, setValue] = useState<string | undefined>(undefined);
  return (
    <Select
      options={FEW_OPTIONS}
      value={value}
      onValueChange={setValue}
      placeholder="انتخاب دسته"
      aria-label="دسته"
    />
  );
}

function ControlledMulti() {
  const [value, setValue] = useState<string[]>([]);
  return (
    <Select
      multiple
      options={FEW_OPTIONS}
      value={value}
      onValueChange={setValue}
      placeholder="انتخاب برندها"
      aria-label="برند"
    />
  );
}

describe("Select — تک‌انتخابی (دسکتاپ، Radix)", () => {
  // باز کردن Radix Select با pointerdown واقعی در jsdom قابل‌اعتماد نیست
  // (محدودیت مستند jsdom روی pointer capture/measurement)؛ باز کردن با
  // کیبورد (Enter) مسیر پایدارتری است و همان کد واقعی را امتحان می‌کند.
  it("با Enter باز می‌شود، با فلش/Enter یک گزینه انتخاب می‌شود", async () => {
    render(<ControlledSingle />);
    const trigger = screen.getByRole("combobox", { name: "دسته" });
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    const listbox = await screen.findByRole("listbox");
    expect(listbox).toBeInTheDocument();

    // Radix روی باز شدن اولین گزینه را highlight می‌کند؛ یک ArrowDown به دومی می‌رود.
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(screen.getByRole("combobox")).toHaveTextContent("حرفه‌ای");
  });

  it("Escape بدون انتخاب می‌بندد", async () => {
    render(<ControlledSingle />);
    const trigger = screen.getByRole("combobox");
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    await screen.findByRole("listbox");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});

describe("Select — چندانتخابی", () => {
  it("چند گزینه را همزمان انتخاب و برچسب trigger را به‌روز می‌کند", async () => {
    render(<ControlledMulti />);
    await userEvent.click(screen.getByRole("button", { name: "برند" }));
    const listbox = await screen.findByRole("listbox");
    await userEvent.click(within(listbox).getByText("گیمینگ"));
    await userEvent.click(within(listbox).getByText("اولترابوک"));
    expect(screen.getByRole("button", { name: "برند" })).toHaveTextContent(
      "گیمینگ، اولترابوک",
    );
  });
});

describe("Select — موبایل (Bottom Sheet به‌جای پاپ‌آور دسکتاپ)", () => {
  it("با matchMedia موبایل، به‌جای combobox یک Bottom Sheet باز می‌شود", async () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      ...originalMatchMedia(query),
      matches: query.includes("max-width"),
    })) as typeof window.matchMedia;

    render(<ControlledSingle />);
    const trigger = screen.getByRole("button", { name: "دسته" });
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

    await userEvent.click(trigger);
    const sheet = await screen.findByRole("dialog");
    await userEvent.click(within(sheet).getByText("حرفه‌ای"));
    expect(trigger).toHaveTextContent("حرفه‌ای");

    window.matchMedia = originalMatchMedia;
  });
});

describe("Select — جستجو خودکار وقتی گزینه‌ها بیش از ۱۰ تاست", () => {
  const MANY_OPTIONS: SelectOption[] = Array.from({ length: 12 }, (_, i) => ({
    value: `opt-${i}`,
    label: `گزینه ${i}`,
  }));

  it("با کمتر از ۱۱ گزینه جعبه‌ی جستجو نیست", async () => {
    render(<ControlledSingle />);
    screen.getByRole("combobox").focus();
    await userEvent.keyboard("{Enter}");
    await screen.findByRole("listbox");
    expect(screen.queryByPlaceholderText("جستجو...")).not.toBeInTheDocument();
  });

  it("با بیش از ۱۰ گزینه در حالت چندانتخابی جعبه‌ی جستجو ظاهر می‌شود", async () => {
    const onValueChange = vi.fn();
    render(
      <Select
        multiple
        options={MANY_OPTIONS}
        value={[]}
        onValueChange={onValueChange}
        aria-label="گزینه‌ها"
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "گزینه‌ها" }));
    expect(await screen.findByPlaceholderText("جستجو...")).toBeInTheDocument();
  });
});
