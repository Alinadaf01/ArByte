"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button, Card, FormField, Input, Switch } from "@arbyte/ui";
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
      <form onSubmit={handleSave}>
        <Card>
          <h3 className="text-primary mb-4 text-subhead font-heading">
            {dictionary.settings.account.title}
          </h3>
          <div className="flex flex-col gap-3">
            <FormField label={dictionary.settings.account.nameLabel}>
              <Input type="text" defaultValue={dictionary.header.profileName} />
            </FormField>
            <FormField label={dictionary.settings.account.emailLabel}>
              <Input type="email" defaultValue="admin@arbyte.ir" />
            </FormField>
            <Button
              type="submit"
              className="mt-1"
              icon={saved ? <Check size={16} aria-hidden="true" /> : undefined}
            >
              {saved
                ? dictionary.settings.account.savedLabel
                : dictionary.settings.account.saveLabel}
            </Button>
          </div>
        </Card>
      </form>

      <Card>
        <h3 className="text-primary mb-4 text-subhead font-heading">
          {dictionary.settings.notifications.title}
        </h3>
        <div className="flex flex-col gap-1">
          {NOTIFICATION_ITEMS.map((item) => (
            <Switch
              key={item.key}
              label={item.label}
              checked={toggles[item.key]}
              onChange={() =>
                setToggles((prev) => ({
                  ...prev,
                  [item.key]: !prev[item.key],
                }))
              }
              className="hover:bg-surface-muted w-full justify-between rounded-tile px-2 py-2.5"
            />
          ))}
        </div>
      </Card>
    </section>
  );
}
