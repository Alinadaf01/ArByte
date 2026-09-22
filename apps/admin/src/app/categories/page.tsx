"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { AdminCategory } from "@arbyte/contracts";
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

const t = dictionary.categories;

interface CategoryFormState {
  name: string;
  slug: string;
  parentId: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
  metaTitle: string;
  metaDescription: string;
  canonical: string;
}

function toFormState(category?: AdminCategory): CategoryFormState {
  return {
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    parentId: category?.parentId ?? "",
    description: category?.description ?? "",
    sortOrder: String(category?.sortOrder ?? 0),
    isActive: category?.isActive ?? true,
    metaTitle: category?.seo?.metaTitle ?? "",
    metaDescription: category?.seo?.metaDescription ?? "",
    canonical: category?.seo?.canonical ?? "",
  };
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [form, setForm] = useState<CategoryFormState>(toFormState());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiGet<AdminCategory[]>("/admin/categories");
      setCategories(data);
    } catch (err) {
      setLoadError(err instanceof ApiClientError ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(toFormState());
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (category: AdminCategory) => {
    setEditing(category);
    setForm(toFormState(category));
    setFormError(null);
    setFormOpen(true);
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastOpen(true);
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const body = {
        name: form.name,
        slug: form.slug || undefined,
        parentId: form.parentId || undefined,
        description: form.description || undefined,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
        seo:
          form.metaTitle || form.metaDescription || form.canonical
            ? {
                metaTitle: form.metaTitle || undefined,
                metaDescription: form.metaDescription || undefined,
                canonical: form.canonical || undefined,
              }
            : undefined,
      };
      if (editing) {
        await apiPatch<AdminCategory>(`/admin/categories/${editing.id}`, body);
        showToast("دسته‌بندی ویرایش شد.");
      } else {
        await apiPost<AdminCategory>("/admin/categories", body);
        showToast("دسته‌بندی ساخته شد.");
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
      await apiDelete(`/admin/categories/${deleteTarget.id}`);
      setDeleteTarget(null);
      showToast("دسته‌بندی حذف شد.");
      await load();
    } catch (err) {
      setDeleteError(err instanceof ApiClientError ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  };

  const parentOptions: SelectOption[] = [
    { value: "", label: t.parentNoneLabel },
    ...categories
      .filter((c) => !c.parentId && c.id !== editing?.id)
      .map((c) => ({ value: c.id, label: c.name })),
  ];

  const columns: DataTableColumn<AdminCategory>[] = [
    {
      key: "name",
      header: t.columns.name,
      render: (row) => (
        <span className="text-primary font-medium">{row.name}</span>
      ),
      sortValue: (row) => row.name,
    },
    {
      key: "slug",
      header: t.columns.slug,
      render: (row) => (
        <span dir="ltr" className="text-caption text-secondary">
          {row.slug}
        </span>
      ),
    },
    {
      key: "parent",
      header: t.columns.parent,
      render: (row) => {
        const parent = categories.find((c) => c.id === row.parentId);
        return parent ? (
          <span className="text-secondary">{parent.name}</span>
        ) : (
          <span className="text-caption text-secondary">—</span>
        );
      },
    },
    {
      key: "status",
      header: t.columns.status,
      render: (row) => (
        <Badge tone={row.isActive ? "success" : "neutral"}>
          {row.isActive ? t.statusActive : t.statusInactive}
        </Badge>
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
      ) : !loading && categories.length === 0 ? (
        <EmptyState
          title={t.emptyStateTitle}
          action={<Button onClick={openCreate}>{t.emptyStateAction}</Button>}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={categories}
          getRowId={(row) => row.id}
          loading={loading}
          selectable={false}
          rowActions={(row) => (
            <div className="flex items-center gap-1">
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
          <FormField label={t.form.nameLabel}>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </FormField>
          <FormField label={t.form.slugLabel} helpText={t.form.slugHelp}>
            <Input
              dir="ltr"
              className="text-end"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            />
          </FormField>
          <FormField label={t.form.parentLabel} helpText={t.form.parentHelp}>
            <Select
              options={parentOptions}
              value={form.parentId}
              onValueChange={(v) => setForm((f) => ({ ...f, parentId: v }))}
              aria-label={t.form.parentLabel}
              sheetTitle={t.form.parentLabel}
            />
          </FormField>
          <FormField label={t.form.descriptionLabel}>
            <Input
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </FormField>
          <FormField label={t.form.sortOrderLabel}>
            <Input
              type="number"
              value={form.sortOrder}
              onChange={(e) =>
                setForm((f) => ({ ...f, sortOrder: e.target.value }))
              }
            />
          </FormField>
          <Switch
            label={t.form.activeLabel}
            checked={form.isActive}
            onChange={(e) =>
              setForm((f) => ({ ...f, isActive: e.target.checked }))
            }
            className="justify-between"
          />

          <h4 className="text-caption text-secondary mt-1 font-emphasis">
            {t.form.seoSectionTitle}
          </h4>
          <FormField label={t.form.metaTitleLabel}>
            <Input
              value={form.metaTitle}
              onChange={(e) =>
                setForm((f) => ({ ...f, metaTitle: e.target.value }))
              }
            />
          </FormField>
          <FormField label={t.form.metaDescriptionLabel}>
            <Input
              value={form.metaDescription}
              onChange={(e) =>
                setForm((f) => ({ ...f, metaDescription: e.target.value }))
              }
            />
          </FormField>
          <FormField label={t.form.canonicalLabel}>
            <Input
              dir="ltr"
              className="text-end"
              value={form.canonical}
              onChange={(e) =>
                setForm((f) => ({ ...f, canonical: e.target.value }))
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

      <Toast open={toastOpen} onOpenChange={setToastOpen}>
        {toastMessage}
      </Toast>
    </div>
  );
}
