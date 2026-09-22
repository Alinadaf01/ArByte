import { useMemo, useRef, useState } from "react";
import * as RadixSelect from "@radix-ui/react-select";
import * as Popover from "@radix-ui/react-popover";
import { ui as uiText } from "@arbyte/contracts";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "../lib/cn";
import { useIsMobile } from "../lib/use-media-query";
import { useRovingListboxKeyDown } from "../lib/use-roving-listbox";
import { useFormField } from "./form-field-context";
import { Sheet } from "./Sheet";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectSharedProps {
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  /** عنوان صفحه‌ی Bottom Sheet در موبایل (بند ۵.۳۰). */
  sheetTitle?: string;
  "aria-label"?: string;
}

interface SelectSingleProps extends SelectSharedProps {
  multiple?: false;
  value?: string;
  onValueChange?: (value: string) => void;
}

interface SelectMultipleProps extends SelectSharedProps {
  multiple: true;
  value?: string[];
  onValueChange?: (value: string[]) => void;
}

export type SelectProps = SelectSingleProps | SelectMultipleProps;

const triggerClass = cn(
  "border-border-input bg-surface text-input flex h-11 w-full items-center justify-between gap-2 rounded-tile border px-4",
  "outline-none transition-colors duration-200 hover:border-brand",
  "data-[state=open]:border-brand data-[state=open]:ring-brand/15 data-[state=open]:ring-4",
  "focus-visible:border-brand focus-visible:ring-brand/15 focus-visible:ring-4",
  "disabled:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60",
);

/**
 * بند ۵.۳۰/۵.۳۱. تک/چندانتخابی، جستجوی خودکار وقتی گزینه‌ها > ۱۰ تا (بدون
 * prop جدا — از تعداد `options` محاسبه می‌شود)، و در موبایل به‌جای پاپ‌آور
 * دسکتاپ یک Bottom Sheet واقعی (Radix Dialog با استایل `shadow-sheet`) باز
 * می‌شود — هم‌راستا با بند ۶.۷۰. حالت تک‌انتخابی دسکتاپ از `@radix-ui/react-select`
 * است (کیبورد/typeahead رایگان)؛ حالت چندانتخابی و هر دو حالت موبایل از یک
 * چک‌لیست سفارشی با ناوبری کیبورد دستی استفاده می‌کنند.
 */
export function Select(props: SelectProps) {
  const {
    options,
    placeholder,
    disabled,
    id,
    className,
    sheetTitle,
    multiple,
    value,
    onValueChange,
    "aria-label": ariaLabel,
  } = props;
  const isMobile = useIsMobile();
  const searchable = options.length > 10;
  const field = useFormField();
  const resolvedId = id ?? field?.id;

  if (multiple) {
    return (
      <MultiSelect
        options={options}
        placeholder={placeholder}
        disabled={disabled}
        id={resolvedId}
        className={className}
        searchable={searchable}
        isMobile={isMobile}
        sheetTitle={sheetTitle}
        value={value ?? []}
        onValueChange={onValueChange ?? (() => {})}
        ariaLabel={ariaLabel}
        describedBy={field?.describedBy}
      />
    );
  }

  if (isMobile) {
    return (
      <SingleSelectSheet
        options={options}
        placeholder={placeholder}
        disabled={disabled}
        id={resolvedId}
        className={className}
        searchable={searchable}
        sheetTitle={sheetTitle}
        value={value}
        onValueChange={onValueChange ?? (() => {})}
        ariaLabel={ariaLabel}
        describedBy={field?.describedBy}
      />
    );
  }

  return (
    <RadixSelect.Root
      // مقدار خالی صریح به‌جای undefined — وگرنه input مخفی فرم‌ساز Radix
      // در اولین رندر «uncontrolled to controlled» هشدار می‌دهد (الگوی
      // مستند خودِ Radix برای این مورد؛ هیچ Item‌ای value="" ندارد پس
      // تداخلی با یک گزینه‌ی واقعی رخ نمی‌دهد).
      value={value ?? ""}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <RadixSelect.Trigger
        id={resolvedId}
        aria-label={ariaLabel}
        aria-describedby={field?.describedBy}
        className={cn(triggerClass, className)}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon>
          <ChevronDown
            size={16}
            aria-hidden="true"
            className="text-secondary"
          />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className="bg-surface shadow-popover z-50 max-h-[min(320px,60vh)] w-[var(--radix-select-trigger-width)] overflow-hidden rounded-panel-compact"
        >
          {searchable ? <SelectSearchNotice /> : null}
          <RadixSelect.Viewport className="p-1.5">
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className={cn(
                  "text-body text-primary flex cursor-pointer items-center justify-between gap-2 rounded-tile-sm px-3 py-2.5 outline-none",
                  "data-[highlighted]:bg-brand-tint-1 data-[state=checked]:text-brand data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                )}
              >
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator>
                  <Check size={16} aria-hidden="true" />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}

function SelectSearchNotice() {
  // Radix Select.Content تایپ‌اِهد خودش را کیبورد-محور مدیریت می‌کند؛ برای
  // بیش از ۱۰ گزینه صرفاً یک راهنمای کوچک نشان می‌دهیم — تایپ‌کردن هر حرف
  // خودکار به اولین گزینه‌ی هم‌نام می‌پرد (رفتار پیش‌فرض Radix).
  return (
    <div className="text-caption border-border-divider text-secondary flex items-center gap-1.5 border-b px-3 py-2">
      <Search size={13} aria-hidden="true" />
      {uiText.typeToSearch}
    </div>
  );
}

interface ListboxCommonProps {
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
  searchable: boolean;
  sheetTitle?: string;
  ariaLabel?: string;
  describedBy?: string;
}

function useFilteredOptions(options: SelectOption[], searchable: boolean) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(
    () =>
      searchable && search.trim()
        ? options.filter((o) => o.label.includes(search.trim()))
        : options,
    [options, search, searchable],
  );
  return { search, setSearch, filtered };
}

function SearchBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="border-border-divider relative border-b p-2">
      <Search
        size={15}
        aria-hidden="true"
        className="text-secondary pointer-events-none absolute inset-y-0 start-4 my-auto"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={uiText.search}
        className="bg-surface-muted text-body w-full rounded-tile-sm py-2 pe-3 ps-9 outline-none"
      />
    </div>
  );
}

function MultiSelect({
  options,
  placeholder,
  disabled,
  id,
  className,
  searchable,
  isMobile,
  sheetTitle,
  value,
  onValueChange,
  ariaLabel,
  describedBy,
}: ListboxCommonProps & {
  isMobile: boolean;
  value: string[];
  onValueChange: (value: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const { search, setSearch, filtered } = useFilteredOptions(
    options,
    searchable,
  );
  const listRef = useRef<HTMLDivElement>(null);
  const handleListKeyDown = useRovingListboxKeyDown(listRef);

  const toggle = (optionValue: string) => {
    onValueChange(
      value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue],
    );
  };

  const labels = options
    .filter((o) => value.includes(o.value))
    .map((o) => o.label);
  const triggerText = labels.length > 0 ? labels.join("، ") : placeholder;

  const list = (
    <ChecklistBody
      options={filtered}
      selected={value}
      onToggle={toggle}
      emptyText={uiText.noResults}
    />
  );

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-describedby={describedBy}
          className={cn(triggerClass, "text-start", className)}
          onClick={() => setOpen(true)}
        >
          <span
            className={cn("truncate", labels.length === 0 && "text-secondary")}
          >
            {triggerText}
          </span>
          <ChevronDown
            size={16}
            aria-hidden="true"
            className="text-secondary shrink-0"
          />
        </button>
        <Sheet
          open={open}
          onOpenChange={setOpen}
          title={sheetTitle ?? placeholder ?? ""}
          footer={
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="bg-brand text-on-dark rounded-pill px-5 py-2.5 text-body font-emphasis"
              >
                {uiText.confirm}
              </button>
            </div>
          }
        >
          {searchable ? (
            <SearchBox value={search} onChange={setSearch} />
          ) : null}
          <div
            ref={listRef}
            role="listbox"
            aria-multiselectable="true"
            aria-label={ariaLabel}
            onKeyDown={handleListKeyDown}
            className="p-2"
          >
            {list}
          </div>
        </Sheet>
      </>
    );
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild disabled={disabled}>
        <button
          type="button"
          id={id}
          aria-label={ariaLabel}
          aria-describedby={describedBy}
          className={cn(triggerClass, "text-start", className)}
        >
          <span
            className={cn("truncate", labels.length === 0 && "text-secondary")}
          >
            {triggerText}
          </span>
          <ChevronDown
            size={16}
            aria-hidden="true"
            className="text-secondary shrink-0"
          />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={4}
          align="start"
          className="bg-surface shadow-popover z-50 w-[min(320px,90vw)] overflow-hidden rounded-panel-compact"
        >
          {searchable ? (
            <SearchBox value={search} onChange={setSearch} />
          ) : null}
          <div
            ref={listRef}
            role="listbox"
            aria-multiselectable="true"
            aria-label={ariaLabel}
            onKeyDown={handleListKeyDown}
            className="max-h-[min(280px,50vh)] overflow-y-auto p-1.5"
          >
            {list}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function SingleSelectSheet({
  options,
  placeholder,
  disabled,
  id,
  className,
  searchable,
  sheetTitle,
  value,
  onValueChange,
  ariaLabel,
  describedBy,
}: ListboxCommonProps & {
  value: string | undefined;
  onValueChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { search, setSearch, filtered } = useFilteredOptions(
    options,
    searchable,
  );
  const selectedLabel = options.find((o) => o.value === value)?.label;
  const listRef = useRef<HTMLDivElement>(null);
  const handleListKeyDown = useRovingListboxKeyDown(listRef);

  return (
    <>
      <button
        type="button"
        id={id}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        className={cn(triggerClass, "text-start", className)}
        onClick={() => setOpen(true)}
      >
        <span className={cn("truncate", !selectedLabel && "text-secondary")}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="text-secondary shrink-0"
        />
      </button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={sheetTitle ?? placeholder ?? ""}
      >
        {searchable ? <SearchBox value={search} onChange={setSearch} /> : null}
        <div
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          onKeyDown={handleListKeyDown}
          className="p-2"
        >
          {filtered.length === 0 ? (
            <p className="text-caption text-secondary p-4 text-center">
              {uiText.noResults}
            </p>
          ) : (
            filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                disabled={option.disabled}
                onClick={() => {
                  onValueChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "text-body text-primary flex w-full items-center justify-between gap-2 rounded-tile-sm px-3 py-3 text-start",
                  "hover:bg-brand-tint-1 disabled:pointer-events-none disabled:opacity-50",
                  option.value === value && "text-brand",
                )}
              >
                {option.label}
                {option.value === value ? (
                  <Check size={16} aria-hidden="true" />
                ) : null}
              </button>
            ))
          )}
        </div>
      </Sheet>
    </>
  );
}

function ChecklistBody({
  options,
  selected,
  onToggle,
  emptyText,
}: {
  options: SelectOption[];
  selected: string[];
  onToggle: (value: string) => void;
  emptyText: string;
}) {
  if (options.length === 0) {
    return (
      <p className="text-caption text-secondary p-4 text-center">{emptyText}</p>
    );
  }
  return (
    <>
      {options.map((option) => {
        const checked = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={checked}
            disabled={option.disabled}
            onClick={() => onToggle(option.value)}
            className={cn(
              "text-body text-primary flex w-full items-center justify-between gap-2 rounded-tile-sm px-3 py-2.5 text-start",
              "hover:bg-brand-tint-1 disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            {option.label}
            <span
              aria-hidden="true"
              className={cn(
                "border-border-input flex h-5 w-5 shrink-0 items-center justify-center rounded-chip border",
                checked && "bg-brand border-brand text-on-dark",
              )}
            >
              {checked ? <Check size={13} strokeWidth={3} /> : null}
            </span>
          </button>
        );
      })}
    </>
  );
}
