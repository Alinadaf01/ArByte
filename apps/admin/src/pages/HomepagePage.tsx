import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/PageHeader";
import { useQueryFilters } from "@/lib/useQueryFilters";
import { HeroTab } from "@/pages/homepage/HeroTab";
import { ShowcasesTab } from "@/pages/homepage/ShowcasesTab";
import { CommunityTilesTab } from "@/pages/homepage/CommunityTilesTab";

const TABS = [
  { key: "hero", label: "هیرو" },
  { key: "showcases", label: "بلوک‌های نمایش" },
  { key: "community", label: "کاشی‌های جامعه" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function HomepagePage() {
  const [filters, setFilters] = useQueryFilters({ tab: "hero" });
  const tab = (
    TABS.some((t) => t.key === filters.tab) ? filters.tab : "hero"
  ) as TabKey;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="صفحه اصلی"
        description="هیرو، بلوک‌های نمایش محصول و کاشی‌های جامعه در صفحه اصلی فروشگاه."
      />

      <div className="flex gap-2 rounded-xl border border-white/[0.06] bg-ink-800/40 p-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilters({ tab: t.key })}
            className={cn(
              "flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-300",
              tab === t.key
                ? "bg-brand-500/15 text-brand-300"
                : "text-slate-400 hover:text-white",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "hero" && <HeroTab />}
      {tab === "showcases" && <ShowcasesTab />}
      {tab === "community" && <CommunityTilesTab />}
    </div>
  );
}
