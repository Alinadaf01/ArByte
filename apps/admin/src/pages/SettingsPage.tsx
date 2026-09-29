import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/PageHeader";
import { useQueryFilters } from "@/lib/useQueryFilters";
import { SiteInfoTab } from "@/pages/settings/SiteInfoTab";
import { ApiCredentialsTab } from "@/pages/settings/ApiCredentialsTab";
import { ShippingMethodsTab } from "@/pages/settings/ShippingMethodsTab";
import { SmsTab } from "@/pages/settings/SmsTab";

const TABS = [
  { key: "site", label: "اطلاعات سایت" },
  { key: "credentials", label: "کلیدهای API" },
  { key: "shipping", label: "روش‌های ارسال" },
  { key: "sms", label: "پیامک" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function SettingsPage() {
  const [filters, setFilters] = useQueryFilters({ tab: "site" });
  const tab = (
    TABS.some((t) => t.key === filters.tab) ? filters.tab : "site"
  ) as TabKey;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="تنظیمات"
        description="اطلاعات فروشگاه، گارانتی، کارت‌به‌کارت، کلیدهای API، روش‌های ارسال و پیامک."
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

      {tab === "site" && <SiteInfoTab />}
      {tab === "credentials" && <ApiCredentialsTab />}
      {tab === "shipping" && <ShippingMethodsTab />}
      {tab === "sms" && <SmsTab />}
    </div>
  );
}
