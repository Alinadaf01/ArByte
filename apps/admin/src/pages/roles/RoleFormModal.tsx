import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { createRole, updateRole } from "@/lib/api";
import { useToast } from "@/lib/ToastContext";
import type { AdminRole, AdminSection, SectionAction } from "@/types/role";

const ACTIONS: SectionAction[] = ["view", "create", "edit", "delete"];
const ACTION_LABELS: Record<SectionAction, string> = {
  view: "مشاهده",
  create: "ایجاد",
  edit: "ویرایش",
  delete: "حذف",
};

export function RoleFormModal({
  role,
  sections,
  open,
  onClose,
}: {
  role: AdminRole | "new" | null;
  sections: AdminSection[];
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const isEdit = role !== null && role !== "new";
  const isSystem = isEdit && role.isSystem;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [grants, setGrants] = useState<Record<string, Set<SectionAction>>>({});

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setName(role.name);
      setDescription(role.description);
      setGrants(
        Object.fromEntries(
          Object.entries(role.grants).map(([section, actions]) => [
            section,
            new Set(actions),
          ]),
        ),
      );
    } else {
      setName("");
      setDescription("");
      setGrants({});
    }
  }, [open, role, isEdit]);

  function toggle(section: string, action: SectionAction) {
    setGrants((prev) => {
      const next = { ...prev };
      const current = new Set(next[section] ?? []);
      if (current.has(action)) current.delete(action);
      else current.add(action);
      next[section] = current;
      return next;
    });
  }

  function toggleRow(section: string, actions: SectionAction[]) {
    setGrants((prev) => {
      const current = prev[section] ?? new Set<SectionAction>();
      const allChecked = actions.every((a) => current.has(a));
      return { ...prev, [section]: allChecked ? new Set() : new Set(actions) };
    });
  }

  function toggleColumn(action: SectionAction) {
    const applicableSections = sections.filter((s) =>
      s.actions.includes(action),
    );
    const allChecked = applicableSections.every((s) =>
      grants[s.key]?.has(action),
    );
    setGrants((prev) => {
      const next = { ...prev };
      for (const section of applicableSections) {
        const current = new Set(next[section.key] ?? []);
        if (allChecked) current.delete(action);
        else current.add(action);
        next[section.key] = current;
      }
      return next;
    });
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        description,
        grants: Object.fromEntries(
          Object.entries(grants)
            .filter(([, actions]) => actions.size > 0)
            .map(([section, actions]) => [section, Array.from(actions)]),
        ),
      };
      return isEdit ? updateRole(role.id, payload) : createRole(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      toast.showSuccess(isEdit ? "نقش ذخیره شد." : "نقش ایجاد شد.");
      onClose();
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "ذخیره ناموفق بود.",
      ),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `ویرایش نقش «${role.name}»` : "نقش جدید"}
      widthClass="max-w-3xl"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="flex flex-col gap-5"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="نام نقش" htmlFor="role-name">
            <Input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>
          <Field label="توضیحات" htmlFor="role-description">
            <Input
              id="role-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                <th className="px-4 py-2 font-medium">بخش</th>
                {ACTIONS.map((action) => (
                  <th
                    key={action}
                    className="px-3 py-2 text-center font-medium"
                  >
                    <button
                      type="button"
                      onClick={() => toggleColumn(action)}
                      className="hover:text-brand-300"
                    >
                      {ACTION_LABELS[action]}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {sections.map((section) => (
                <tr key={section.key}>
                  <td className="px-4 py-2">
                    <button
                      type="button"
                      onClick={() => toggleRow(section.key, section.actions)}
                      className={`font-semibold hover:text-brand-300 ${section.sensitive ? "text-warning" : "text-white"}`}
                      title={section.sensitive ? "بخش حساس" : undefined}
                    >
                      {section.label}
                      {section.sensitive && " ⚠"}
                    </button>
                  </td>
                  {ACTIONS.map((action) => (
                    <td key={action} className="px-3 py-2 text-center">
                      {section.actions.includes(action) ? (
                        <input
                          type="checkbox"
                          checked={grants[section.key]?.has(action) ?? false}
                          onChange={() => toggle(section.key, action)}
                          className="size-4 accent-brand-500"
                        />
                      ) : (
                        <span className="text-slate-700">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isSystem && (
          <p className="m-0 text-xs text-slate-500">
            این یکی از نقش‌های پیش‌فرض سیستم است — قابل ویرایش، ولی قابل حذف
            نیست.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            انصراف
          </Button>
          <Button type="submit" disabled={mutation.isPending || !name.trim()}>
            {mutation.isPending ? "در حال ذخیره…" : "ذخیره"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
