"use client";

import { useEffect, useState } from "react";
import { Info, ListChecks, Pencil, Plus, Trash2 } from "lucide-react";
import type {
  AdminCategory,
  AdminSpecificationDefinition,
  SpecificationType,
} from "@arbyte/contracts";
import {
  Badge,
  Button,
  EmptyState,
  FormField,
  Input,
  Modal,
  Select,
  Switch,
  Toast,
  Tooltip,
  type SelectOption,
} from "@arbyte/ui";
import { DataTable, type DataTableColumn } from "@/components/table/DataTable";
import { dictionary } from "@/lib/dictionary";
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  ApiClientError,
} from "@/lib/api-client";

const t = dictionary.specifications;

const TYPE_OPTIONS: SelectOption[] = (
  Object.keys(t.typeLabels) as SpecificationType[]
).map((key) => ({ value: key, label: t.typeLabels[key] }));

interface DefinitionFormState {
  key: string;
  nameFa: string;
  type: SpecificationType;
  unit: string;
  categoryId: string;
  isRequired: boolean;
  isFilterable: boolean;
  isSearchable: boolean;
  isVariantAxis: boolean;
  sortOrder: string;
}

function toFormState(def?: AdminSpecificationDefinition): DefinitionFormState {
  return {
    key: def?.key ?? "",
    nameFa: def?.nameFa ?? "",
    type: def?.type ?? "TEXT",
    unit: def?.unit ?? "",
    categoryId: def?.categoryId ?? "",
    isRequired: def?.isRequired ?? false,
    isFilterable: def?.isFilterable ?? false,
    isSearchable: def?.isSearchable ?? false,
    isVariantAxis: def?.isVariantAxis ?? false,
    sortOrder: String(def?.sortOrder ?? 0),
  };
}

interface ValueFormState {
  value: string;
  swatchHex: string;
  sortOrder: string;
}

const EMPTY_VALUE_FORM: ValueFormState = {
  value: "",
  swatchHex: "",
  sortOrder: "0",
};

export default function SpecificationsPage() {
  const [definitions, setDefinitions] = useState<
    AdminSpecificationDefinition[]
  >([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminSpecificationDefinition | null>(
    null,
  );
  const [form, setForm] = useState<DefinitionFormState>(toFormState());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] =
    useState<AdminSpecificationDefinition | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [valuesFor, setValuesFor] =
    useState<AdminSpecificationDefinition | null>(null);
  const [valueForm, setValueForm] = useState<ValueFormState>(EMPTY_VALUE_FORM);
  const [valueError, setValueError] = useState<string | null>(null);
  const [savingValue, setSavingValue] = useState(false);
  const [valueDeleteError, setValueDeleteError] = useState<string | null>(null);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [defs, cats] = await Promise.all([
        apiGet<AdminSpecificationDefinition[]>("/admin/specifications"),
        apiGet<AdminCategory[]>("/admin/categories"),
      ]);
      setDefinitions(defs);
      setCategories(cats);
    } catch (err) {
      setLoadError(err instanceof ApiClientError ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(toFormState());
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (def: AdminSpecificationDefinition) => {
    setEditing(def);
    setForm(toFormState(def));
    setFormError(null);
    setFormOpen(true);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const body = {
        key: form.key,
        nameFa: form.nameFa,
        type: form.type,
        unit: form.unit || undefined,
        categoryId: form.categoryId || undefined,
        isRequired: form.isRequired,
        isFilterable: form.isFilterable,
        isSearchable: form.isSearchable,
        isVariantAxis: form.isVariantAxis,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editing) {
        await apiPatch<AdminSpecificationDefinition>(
          `/admin/specifications/${editing.id}`,
          body,
        );
        showToast("مشخصه ویرایش شد.");
      } else {
        await apiPost<AdminSpecificationDefinition>(
          "/admin/specifications",
          body,
        );
        showToast("مشخصه ساخته شد.");
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiDelete(`/admin/specifications/${deleteTarget.id}`);
      setDeleteTarget(null);
      showToast("مشخصه حذف شد.");
      await load();
    } catch (err) {
      setDeleteError(err instanceof ApiClientError ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  };

  const openValues = (def: AdminSpecificationDefinition) => {
    setValuesFor(def);
    setValueForm(EMPTY_VALUE_FORM);
    setValueError(null);
    setValueDeleteError(null);
  };

  const refreshValuesFor = (updated: AdminSpecificationDefinition) => {
    setValuesFor(updated);
    setDefinitions((prev) =>
      prev.map((d) => (d.id === updated.id ? updated : d)),
    );
  };

  const addValue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valuesFor) return;
    setSavingValue(true);
    setValueError(null);
    try {
      const updated = await apiPost<AdminSpecificationDefinition>(
        `/admin/specifications/${valuesFor.id}/values`,
        {
          value: valueForm.value,
          swatchHex:
            valuesFor.type === "COLOR"
              ? valueForm.swatchHex || undefined
              : undefined,
          sortOrder: Number(valueForm.sortOrder) || 0,
        },
      );
      refreshValuesFor(updated);
      setValueForm(EMPTY_VALUE_FORM);
    } catch (err) {
      setValueError(err instanceof ApiClientError ? err.message : String(err));
    } finally {
      setSavingValue(false);
    }
  };

  const removeValue = async (valueId: string) => {
    if (!valuesFor) return;
    setValueDeleteError(null);
    try {
      const updated = await apiDelete<AdminSpecificationDefinition>(
        `/admin/specifications/${valuesFor.id}/values/${valueId}`,
      );
      refreshValuesFor(updated);
    } catch (err) {
      setValueDeleteError(
        err instanceof ApiClientError ? err.message : String(err),
      );
    }
  };

  const categoryOptions: SelectOption[] = [
    { value: "", label: t.form.categoryNoneLabel },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];

  const columns: DataTableColumn<AdminSpecificationDefinition>[] = [
    {
      key: "nameFa",
      header: t.columns.nameFa,
      render: (row) => (
        <span className="text-primary font-medium">{row.nameFa}</span>
      ),
      sortValue: (row) => row.nameFa,
    },
    {
      key: "key",
      header: t.columns.key,
      render: (row) => (
        <span dir="ltr" className="text-caption text-secondary">
          {row.key}
        </span>
      ),
    },
    {
      key: "type",
      header: t.columns.type,
      render: (row) => (
        <span className="text-secondary">{t.typeLabels[row.type]}</span>
      ),
    },
    {
      key: "variantAxis",
      header: t.columns.variantAxis,
      render: (row) => (
        <span className="inline-flex items-center gap-1.5">
          <Badge tone={row.isVariantAxis ? "brand" : "neutral"}>
            {row.isVariantAxis ? t.variantAxisYes : t.variantAxisNo}
          </Badge>
          <Tooltip content={t.variantAxisHelp}>
            <span className="text-caption inline-flex">
              <Info size={14} aria-hidden="true" />
            </span>
          </Tooltip>
        </span>
      ),
    },
    {
      key: "values",
      header: t.columns.values,
      render: (row) => (
        <span className="text-caption text-secondary">{row.values.length}</span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          icon={<Plus size={16} aria-hidden="true" />}
          onClick={openCreate}
        >
          {t.createButton}
        </Button>
      </div>

      {loadError ? (
        <p className="text-danger text-body">{loadError}</p>
      ) : !loading && definitions.length === 0 ? (
        <EmptyState
          title={t.emptyStateTitle}
          action={<Button onClick={openCreate}>{t.emptyStateAction}</Button>}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={definitions}
          getRowId={(row) => row.id}
          loading={loading}
          selectable={false}
          rowActions={(row) => (
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={t.values.title}
                onClick={() => openValues(row)}
                className="text-secondary hover:bg-brand-tint-1 hover:text-brand flex h-9 w-9 items-center justify-center rounded-tile"
              >
                <ListChecks size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={t.editTitle}
                onClick={() => openEdit(row)}
                className="text-secondary hover:bg-brand-tint-1 hover:text-brand flex h-9 w-9 items-center justify-center rounded-tile"
              >
                <Pencil size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={t.deleteConfirmTitle}
                onClick={() => {
                  setDeleteTarget(row);
                  setDeleteError(null);
                }}
                className="text-secondary hover:bg-danger-tint hover:text-danger flex h-9 w-9 items-center justify-center rounded-tile"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        />
      )}

      <Modal
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? t.editTitle : t.createTitle}
      >
        <form onSubmit={submitForm} className="flex flex-col gap-3">
          <FormField label={t.form.keyLabel} helpText={t.form.keyHelp}>
            <Input
              dir="ltr"
              className="text-end"
              value={form.key}
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
              required
            />
          </FormField>
          <FormField label={t.form.nameFaLabel}>
            <Input
              value={form.nameFa}
              onChange={(e) =>
                setForm((f) => ({ ...f, nameFa: e.target.value }))
              }
              required
            />
          </FormField>
          <FormField label={t.form.typeLabel}>
            <Select
              options={TYPE_OPTIONS}
              value={form.type}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, type: v as SpecificationType }))
              }
              aria-label={t.form.typeLabel}
              sheetTitle={t.form.typeLabel}
            />
          </FormField>
          <FormField label={t.form.unitLabel}>
            <Input
              dir="ltr"
              className="text-end"
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
            />
          </FormField>
          <FormField label={t.form.categoryLabel}>
            <Select
              options={categoryOptions}
              value={form.categoryId}
              onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
              aria-label={t.form.categoryLabel}
              sheetTitle={t.form.categoryLabel}
            />
          </FormField>

          <Switch
            label={t.form.isRequiredLabel}
            checked={form.isRequired}
            onChange={(e) =>
              setForm((f) => ({ ...f, isRequired: e.target.checked }))
            }
            className="justify-between"
          />
          <Switch
            label={t.form.isFilterableLabel}
            checked={form.isFilterable}
            onChange={(e) =>
              setForm((f) => ({ ...f, isFilterable: e.target.checked }))
            }
            className="justify-between"
          />
          <Switch
            label={t.form.isSearchableLabel}
            checked={form.isSearchable}
            onChange={(e) =>
              setForm((f) => ({ ...f, isSearchable: e.target.checked }))
            }
            className="justify-between"
          />
          <div className="flex items-center justify-between gap-2">
            <Switch
              label={t.form.isVariantAxisLabel}
              checked={form.isVariantAxis}
              onChange={(e) =>
                setForm((f) => ({ ...f, isVariantAxis: e.target.checked }))
              }
              className="flex-1 justify-between"
            />
            <Tooltip content={t.variantAxisHelp}>
              <span className="text-caption inline-flex">
                <Info size={16} aria-hidden="true" />
              </span>
            </Tooltip>
          </div>

          <FormField label={t.form.sortOrderLabel}>
            <Input
              type="number"
              value={form.sortOrder}
              onChange={(e) =>
                setForm((f) => ({ ...f, sortOrder: e.target.value }))
              }
            />
          </FormField>

          {formError ? (
            <p className="text-danger text-caption">{formError}</p>
          ) : null}

          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setFormOpen(false)}
            >
              {t.form.cancelLabel}
            </Button>
            <Button
              type="submit"
              loading={saving}
              loadingText="در حال ذخیره..."
            >
              {t.form.saveLabel}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t.deleteConfirmTitle}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              {t.form.cancelLabel}
            </Button>
            <Button
              variant="destructive"
              loading={deleting}
              loadingText="در حال حذف..."
              onClick={confirmDelete}
            >
              {t.deleteConfirmTitle}
            </Button>
          </>
        }
      >
        <p className="text-body text-secondary">{t.deleteConfirmBody}</p>
        {deleteError ? (
          <p className="text-danger text-caption mt-2">{deleteError}</p>
        ) : null}
      </Modal>

      <Modal
        open={valuesFor !== null}
        onOpenChange={(open) => !open && setValuesFor(null)}
        title={
          valuesFor ? `${t.values.title} — ${valuesFor.nameFa}` : t.values.title
        }
      >
        {valuesFor ? (
          <div className="flex flex-col gap-3">
            {valuesFor.values.length === 0 ? (
              <p className="text-caption text-secondary">
                {t.values.emptyState}
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {valuesFor.values.map((v) => (
                  <li
                    key={v.id}
                    className="border-border flex items-center justify-between gap-2 rounded-tile border px-3 py-2"
                  >
                    <span className="flex items-center gap-2">
                      {v.swatchHex ? (
                        <span
                          aria-hidden="true"
                          className="border-border-input h-5 w-5 rounded-full border"
                          style={{ backgroundColor: v.swatchHex }}
                        />
                      ) : null}
                      <span className="text-body text-primary">{v.value}</span>
                    </span>
                    <button
                      type="button"
                      aria-label={t.deleteConfirmTitle}
                      onClick={() => removeValue(v.id)}
                      className="text-secondary hover:bg-danger-tint hover:text-danger flex h-8 w-8 items-center justify-center rounded-tile"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {valueDeleteError ? (
              <p className="text-danger text-caption">{valueDeleteError}</p>
            ) : null}

            <form
              onSubmit={addValue}
              className="border-border-divider flex flex-col gap-2 border-t pt-3"
            >
              <FormField label={t.values.valueLabel}>
                <Input
                  value={valueForm.value}
                  onChange={(e) =>
                    setValueForm((f) => ({ ...f, value: e.target.value }))
                  }
                  required
                />
              </FormField>
              {valuesFor.type === "COLOR" ? (
                <FormField
                  label={t.values.swatchLabel}
                  helpText={t.values.swatchHelp}
                >
                  <input
                    type="color"
                    // بدون مقدار پیش‌فرض صریح — قانون ۱ (بدون HEX در کامپوننت).
                    // مرورگر خودش وقتی value خالی است رنگ پیش‌فرض native را نشان می‌دهد.
                    value={valueForm.swatchHex}
                    onChange={(e) =>
                      setValueForm((f) => ({ ...f, swatchHex: e.target.value }))
                    }
                    className="border-border-input h-11 w-16 rounded-tile border"
                  />
                </FormField>
              ) : null}
              {valueError ? (
                <p className="text-danger text-caption">{valueError}</p>
              ) : null}
              <Button
                type="submit"
                loading={savingValue}
                loadingText="در حال افزودن..."
                className="self-start"
              >
                {t.values.addButton}
              </Button>
            </form>
          </div>
        ) : null}
      </Modal>

      <Toast open={toastOpen} onOpenChange={setToastOpen}>
        {toastMessage}
      </Toast>
    </div>
  );
}
