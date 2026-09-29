import { useState } from "react";
import { jalaaliMonthLength, toGregorian, toJalaali } from "jalaali-js";
import { persianMonths } from "@/lib/formatters";
import { cn } from "@/lib/cn";
import { Select } from "@/components/ui/Field";

type Parts = { jy: number; jm: number; jd: number };

function fromIso(value: string): Parts | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? toJalaali(Number(m[1]), Number(m[2]), Number(m[3])) : null;
}

function toIso({ jy, jm, jd }: Parts): string {
  const { gy, gm, gd } = toGregorian(
    jy,
    jm,
    Math.min(jd, jalaaliMonthLength(jy, jm)),
  );
  return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
}

/**
 * F-04 — انتخاب تاریخ شمسی (روز/ماه/سال) به‌جای input[type=date] میلادی.
 * مقدار بیرونی همان ISO میلادی `YYYY-MM-DD` است تا APIها دست نخورند؛
 * رشته‌ی خالی یعنی بدون فیلتر.
 */
export function JalaliDateInput({
  value,
  onChange,
  label,
  className,
}: {
  value: string;
  onChange: (iso: string) => void;
  label: string;
  className?: string;
}) {
  const current = fromIso(value);
  const thisYear = toJalaali(new Date()).jy;
  const [draft, setDraft] = useState<Partial<Parts>>(current ?? {});
  const parts = current ?? draft;
  const update = (patch: Partial<Parts>) => {
    const next = { ...parts, ...patch };
    setDraft(next);
    if (next.jy && next.jm && next.jd) onChange(toIso(next as Parts));
    else if (current) onChange("");
  };
  const num = (v: string) => (v ? Number(v) : undefined);
  const days =
    parts.jy && parts.jm ? jalaaliMonthLength(parts.jy, parts.jm) : 31;
  return (
    <span
      role="group"
      aria-label={label}
      className={cn("inline-flex flex-wrap items-center gap-1", className)}
    >
      <Select
        className="w-16 px-2"
        aria-label={`${label} — روز`}
        value={parts.jd ?? ""}
        onChange={(e) => update({ jd: num(e.target.value) })}
      >
        <option value="">روز</option>
        {Array.from({ length: days }, (_, i) => (
          <option key={i + 1} value={i + 1}>
            {(i + 1).toLocaleString("fa-IR")}
          </option>
        ))}
      </Select>
      <Select
        className="w-24 px-2"
        aria-label={`${label} — ماه`}
        value={parts.jm ?? ""}
        onChange={(e) => update({ jm: num(e.target.value) })}
      >
        <option value="">ماه</option>
        {persianMonths.map((name, i) => (
          <option key={name} value={i + 1}>
            {name}
          </option>
        ))}
      </Select>
      <Select
        className="w-20 px-2"
        aria-label={`${label} — سال`}
        value={parts.jy ?? ""}
        onChange={(e) => update({ jy: num(e.target.value) })}
      >
        <option value="">سال</option>
        {Array.from({ length: 6 }, (_, i) => thisYear + 1 - i).map((y) => (
          <option key={y} value={y}>
            {y.toLocaleString("fa-IR", { useGrouping: false })}
          </option>
        ))}
      </Select>
      {current && (
        <button
          type="button"
          className="icon-btn text-xs"
          aria-label={`پاک کردن ${label}`}
          onClick={() => {
            setDraft({});
            onChange("");
          }}
        >
          ×
        </button>
      )}
    </span>
  );
}
