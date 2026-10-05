import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Field, Input, Switch, Textarea } from "@/components/ui/Field";
import { ErrorState } from "@/components/ui/Stateviews";
import {
  getAboutPageContent,
  getFaqEntries,
  listLegalDocuments,
  saveFaqEntries,
  updateAboutPageContent,
  updateLegalDocument,
} from "@/lib/api";
import { formatJalaliDateTime } from "@/lib/formatters";
import { cn } from "@/lib/cn";
import { useQueryFilters } from "@/lib/useQueryFilters";
import { useToast } from "@/lib/ToastContext";
import type {
  AboutPageContent,
  FaqEntry,
  LegalDocumentContent,
} from "@/types/contentPages";

type Row = Record<string, string>;

function RowsEditor<T extends Row>({
  label,
  rows,
  fields,
  onChange,
}: {
  label: string;
  rows: T[];
  fields: { key: keyof T & string; label: string; wide?: boolean }[];
  onChange: (rows: T[]) => void;
}) {
  const blank = Object.fromEntries(fields.map((f) => [f.key, ""])) as T;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400">{label}</span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onChange([...rows, blank])}
        >
          <Plus className="size-4" /> ردیف
        </Button>
      </div>
      {rows.length === 0 && (
        <p className="m-0 text-xs text-slate-500">
          خالی — این بخش در فروشگاه نمایش داده نمی‌شود.
        </p>
      )}
      {rows.map((row, i) => (
        <div
          key={i}
          className="flex flex-wrap items-start gap-2 rounded-xl border border-white/[0.06] p-2"
        >
          {fields.map((f) => (
            <Input
              key={f.key}
              aria-label={`${f.label} ${i + 1}`}
              placeholder={f.label}
              className={f.wide ? "min-w-48 flex-[3]" : "min-w-28 flex-1"}
              value={row[f.key] ?? ""}
              onChange={(e) =>
                onChange(
                  rows.map((r, j) =>
                    j === i ? { ...r, [f.key]: e.target.value } : r,
                  ),
                )
              }
            />
          ))}
          <button
            type="button"
            className="icon-btn hover:!text-danger"
            aria-label={`حذف ردیف ${i + 1}`}
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function AboutEditor() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data, isError, refetch } = useQuery({
    queryKey: ["about-page"],
    queryFn: getAboutPageContent,
  });
  const [draft, setDraft] = useState<AboutPageContent | null>(null);
  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);
  const save = useMutation({
    mutationFn: () => updateAboutPageContent(draft!),
    onSuccess: (saved) => {
      queryClient.setQueryData(["about-page"], saved);
      toast.showSuccess("متن درباره ما ذخیره شد.");
    },
    onError: (e: unknown) =>
      toast.showError(e instanceof Error ? e.message : "ذخیره ناموفق بود."),
  });
  if (isError)
    return (
      <ErrorState
        description="دریافت متن ناموفق بود."
        onRetry={() => refetch()}
      />
    );
  if (!draft) return null;
  const set = <K extends keyof AboutPageContent>(
    k: K,
    v: AboutPageContent[K],
  ) => setDraft({ ...draft, [k]: v });
  return (
    <form
      className="glass-card flex flex-col gap-5 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <p className="m-0 text-xs text-slate-400">
        هر بخشی که خالی بماند در صفحه‌ی «درباره ما» پنهان می‌شود. آمار از
        «واقعیت‌های فروشگاه» می‌آید.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="عنوان اصلی" htmlFor="ab-hero-title">
          <Input
            id="ab-hero-title"
            value={draft.heroTitle}
            onChange={(e) => set("heroTitle", e.target.value)}
          />
        </Field>
        <Field label="عنوان «چطور شروع شد»" htmlFor="ab-story-title">
          <Input
            id="ab-story-title"
            value={draft.storyTitle}
            onChange={(e) => set("storyTitle", e.target.value)}
          />
        </Field>
        <Field label="متن زیر عنوان اصلی" htmlFor="ab-hero-body">
          <Textarea
            id="ab-hero-body"
            value={draft.heroBody}
            onChange={(e) => set("heroBody", e.target.value)}
          />
        </Field>
        <Field
          label="داستان"
          htmlFor="ab-story"
          hint="پاراگراف‌ها را با یک خط خالی جدا کنید."
        >
          <Textarea
            id="ab-story"
            className="min-h-32"
            value={draft.storyBody}
            onChange={(e) => set("storyBody", e.target.value)}
          />
        </Field>
      </div>
      <Field label="عنوان اصول" htmlFor="ab-pr-title">
        <Input
          id="ab-pr-title"
          value={draft.principlesTitle}
          onChange={(e) => set("principlesTitle", e.target.value)}
        />
      </Field>
      <RowsEditor
        label="اصول"
        rows={draft.principles}
        fields={[
          { key: "title", label: "عنوان" },
          { key: "body", label: "توضیح", wide: true },
        ]}
        onChange={(v) => set("principles", v)}
      />
      <Field label="عنوان خط زمانی" htmlFor="ab-tl-title">
        <Input
          id="ab-tl-title"
          value={draft.timelineTitle}
          onChange={(e) => set("timelineTitle", e.target.value)}
        />
      </Field>
      <RowsEditor
        label="خط زمانی"
        rows={draft.timeline}
        fields={[
          { key: "year", label: "سال" },
          { key: "note", label: "رویداد", wide: true },
        ]}
        onChange={(v) => set("timeline", v)}
      />
      <Field label="عنوان تیم" htmlFor="ab-team-title">
        <Input
          id="ab-team-title"
          value={draft.teamTitle}
          onChange={(e) => set("teamTitle", e.target.value)}
        />
      </Field>
      <RowsEditor
        label="اعضای تیم"
        rows={draft.team}
        fields={[
          { key: "name", label: "نام" },
          { key: "role", label: "نقش", wide: true },
        ]}
        onChange={(v) => set("team", v)}
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={save.isPending}>
          ذخیره
        </Button>
      </div>
    </form>
  );
}

function LegalEditor() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data, isError, refetch } = useQuery({
    queryKey: ["legal-docs"],
    queryFn: listLegalDocuments,
  });
  const [active, setActive] = useState<LegalDocumentContent["key"]>("terms");
  const doc = data?.find((d) => d.key === active);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  useEffect(() => {
    setTitle(doc?.title ?? "");
    setBody(doc?.body ?? "");
  }, [doc]);
  const save = useMutation({
    mutationFn: () => updateLegalDocument(active, { title, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legal-docs"] });
      toast.showSuccess("سند ذخیره شد.");
    },
    onError: (e: unknown) =>
      toast.showError(e instanceof Error ? e.message : "ذخیره ناموفق بود."),
  });
  if (isError)
    return (
      <ErrorState
        description="دریافت اسناد ناموفق بود."
        onRetry={() => refetch()}
      />
    );
  return (
    <div className="glass-card flex flex-col gap-4 p-6">
      <div className="flex flex-wrap gap-2">
        {data?.map((d) => (
          <button
            key={d.key}
            type="button"
            onClick={() => setActive(d.key)}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-semibold",
              active === d.key
                ? "bg-brand-500/15 text-brand-300"
                : "text-slate-400 hover:text-white",
            )}
          >
            {d.label}
            {!d.body.trim() && (
              <span className="ms-1 text-[10px] text-slate-500">(خالی)</span>
            )}
          </button>
        ))}
      </div>
      {doc && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <Field
            label="عنوان"
            htmlFor="lg-title"
            hint={`خالی = «${doc.label}»`}
          >
            <Input
              id="lg-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field
            label="متن"
            htmlFor="lg-body"
            hint="پاراگراف‌ها با خط خالی جدا می‌شوند؛ خطی که با «## » شروع شود زیرعنوان است. سند خالی در فروشگاه نمایش داده نمی‌شود."
          >
            <Textarea
              id="lg-body"
              className="min-h-72"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </Field>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500">
              آخرین تغییر: {formatJalaliDateTime(doc.updatedAt)}
            </span>
            <Button type="submit" disabled={save.isPending}>
              ذخیره
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

const HOME_LIMIT = 4;

/** سوالات متداول: ترتیب فهرست = ترتیب فروشگاه؛ «صفحه اصلی» چهار مورد اول تیک‌خورده. */
function FaqEditor() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data, isError, refetch } = useQuery({
    queryKey: ["faq-entries"],
    queryFn: getFaqEntries,
  });
  const [items, setItems] = useState<FaqEntry[]>([]);
  useEffect(() => {
    if (data) setItems(data);
  }, [data]);
  const save = useMutation({
    mutationFn: () => saveFaqEntries(items),
    onSuccess: (saved) => {
      queryClient.setQueryData(["faq-entries"], saved);
      toast.showSuccess("سوالات متداول ذخیره شد.");
    },
    onError: (e: unknown) =>
      toast.showError(e instanceof Error ? e.message : "ذخیره ناموفق بود."),
  });
  const update = (i: number, patch: Partial<FaqEntry>) =>
    setItems((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (i: number, by: number) =>
    setItems((rows) => {
      const next = [...rows];
      const [row] = next.splice(i, 1);
      next.splice(i + by, 0, row!);
      return next;
    });
  const onHome = items.filter((r) => r.showOnHome).length;

  if (isError)
    return (
      <ErrorState
        description="دریافت سوالات متداول ناموفق بود."
        onRetry={() => refetch()}
      />
    );
  return (
    <form
      className="glass-card flex flex-col gap-4 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-xs leading-6 text-slate-400">
          در صفحه‌ی «قوانین و سوالات»، پشتیبانی و جستجوی فروشگاه به همین ترتیب
          نمایش داده می‌شوند. {HOME_LIMIT} سوال اولِ تیک‌خورده در صفحه‌ی اصلی
          می‌آیند (الان {onHome}).
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() =>
            setItems((rows) => [
              ...rows,
              { question: "", answer: "", showOnHome: false },
            ])
          }
        >
          <Plus className="size-4" /> سوال تازه
        </Button>
      </div>
      {items.map((row, i) => (
        <div
          key={row.id ?? `new-${i}`}
          className="flex flex-col gap-3 rounded-xl border border-white/[0.06] p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500">
              {i + 1}
            </span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label="بالا"
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label="پایین"
                disabled={i === items.length - 1}
                onClick={() => move(i, 1)}
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label="حذف"
                onClick={() =>
                  setItems((rows) => rows.filter((_, j) => j !== i))
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
          <Field label="سوال" htmlFor={`faq-q-${i}`}>
            <Input
              id={`faq-q-${i}`}
              required
              maxLength={300}
              value={row.question}
              onChange={(e) => update(i, { question: e.target.value })}
            />
          </Field>
          <Field label="پاسخ" htmlFor={`faq-a-${i}`}>
            <Textarea
              id={`faq-a-${i}`}
              required
              className="min-h-24"
              value={row.answer}
              onChange={(e) => update(i, { answer: e.target.value })}
            />
          </Field>
          <Switch
            checked={row.showOnHome}
            onChange={(v) => update(i, { showOnHome: v })}
            label="نمایش در صفحه‌ی اصلی"
          />
        </div>
      ))}
      {items.length === 0 && (
        <p className="m-0 text-xs text-slate-500">
          خالی — بخش سوالات متداول در فروشگاه نمایش داده نمی‌شود.
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={save.isPending}>
          ذخیره
        </Button>
      </div>
    </form>
  );
}

const TABS = [
  { key: "about", label: "درباره ما" },
  { key: "legal", label: "قوانین و اسناد" },
  { key: "faq", label: "سوالات متداول" },
] as const;

/** G-01 — متن صفحه‌های «درباره ما» و «قوانین»؛ هیچ متن پیش‌فرضی در فروشگاه نیست. */
export default function ContentPagesPage() {
  const [filters, setFilters] = useQueryFilters({ tab: "about" });
  const tab =
    filters.tab === "legal" || filters.tab === "faq" ? filters.tab : "about";
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="صفحه‌های محتوا"
        description="متن صفحه‌های «درباره ما»، اسناد «قوانین» (شرایط استفاده، حریم خصوصی، ارسال، مرجوعی، گارانتی) و سوالات متداول."
      />
      <div className="flex gap-2 overflow-x-auto rounded-xl border border-white/[0.06] bg-ink-800/40 p-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilters({ tab: t.key })}
            className={cn(
              "flex-1 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-300",
              tab === t.key
                ? "bg-brand-500/15 text-brand-300"
                : "text-slate-400 hover:text-white",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "about" ? (
        <AboutEditor />
      ) : tab === "legal" ? (
        <LegalEditor />
      ) : (
        <FaqEditor />
      )}
    </div>
  );
}
