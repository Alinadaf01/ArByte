"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { dictionary } from "@/lib/dictionary";

const NOTIFICATION_ITEMS: { key: string; label: string; defaultOn: boolean }[] =
  [
    {
      key: "orderEmail",
      label: dictionary.settings.notifications.items.orderEmail,
      defaultOn: true,
    },
    {
      key: "securitySms",
      label: dictionary.settings.notifications.items.securitySms,
      defaultOn: true,
    },
    {
      key: "newsletter",
      label: dictionary.settings.notifications.items.newsletter,
      defaultOn: false,
    },
    {
      key: "weeklyReport",
      label: dictionary.settings.notifications.items.weeklyReport,
      defaultOn: true,
    },
  ];

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [toggles, setToggles] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      NOTIFICATION_ITEMS.map((item) => [item.key, item.defaultOn]),
    ),
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <form
        onSubmit={handleSave}
        className="bg-surface shadow-card rounded-card-lg p-5"
      >
        <h3 className="text-primary mb-4 text-subhead font-heading">
          {dictionary.settings.account.title}
        </h3>
        <div className="flex flex-col gap-3">
          <label className="block">
            <span className="text-caption mb-1 block text-micro">
              {dictionary.settings.account.nameLabel}
            </span>
            <input
              type="text"
              defaultValue={dictionary.header.profileName}
              className="border-border focus:border-brand focus:ring-brand/15 w-full rounded-tile border bg-transparent px-4 py-2.5 text-body outline-none transition-colors duration-200 focus:ring-4"
            />
          </label>
          <label className="block">
            <span className="text-caption mb-1 block text-micro">
              {dictionary.settings.account.emailLabel}
            </span>
            <input
              type="email"
              dir="ltr"
              defaultValue="admin@arbyte.ir"
              className="border-border focus:border-brand focus:ring-brand/15 w-full rounded-tile border bg-transparent px-4 py-2.5 text-end text-body outline-none transition-colors duration-200 focus:ring-4"
            />
          </label>
          <button
            type="submit"
            className="bg-brand text-on-dark mt-1 flex items-center justify-center gap-2 rounded-pill px-4 py-2.5 text-body font-emphasis transition-colors duration-200"
          >
            {saved ? (
              <>
                <Check size={16} aria-hidden="true" />
                {dictionary.settings.account.savedLabel}
              </>
            ) : (
              dictionary.settings.account.saveLabel
            )}
          </button>
        </div>
      </form>

      <div className="bg-surface shadow-card rounded-card-lg p-5">
        <h3 className="text-primary mb-4 text-subhead font-heading">
          {dictionary.settings.notifications.title}
        </h3>
        <div className="flex flex-col gap-1">
          {NOTIFICATION_ITEMS.map((item) => (
            <label
              key={item.key}
              className="hover:bg-surface-muted flex cursor-pointer items-center justify-between gap-3 rounded-tile px-2 py-2.5"
            >
              <span className="text-primary text-body font-medium">
                {item.label}
              </span>
              <span className="relative inline-flex h-7 w-12 shrink-0 items-center">
                <input
                  type="checkbox"
                  checked={toggles[item.key]}
                  onChange={() =>
                    setToggles((prev) => ({
                      ...prev,
                      [item.key]: !prev[item.key],
                    }))
                  }
                  className="peer sr-only"
                />
                <span className="bg-border peer-checked:bg-brand absolute inset-0 rounded-pill transition-colors duration-200" />
                {/* dir="rtl" همیشه — حالت خاموش راست، روشن با translateX منفی به چپ می‌رود (مثل قالب مرجع) */}
                <span className="bg-surface shadow-card absolute right-1 top-1 h-5 w-5 rounded-pill transition-transform duration-200 peer-checked:-translate-x-5" />
              </span>
            </label>
          ))}
        </div>
      </div>
    </section>
  );
}
