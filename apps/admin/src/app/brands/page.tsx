"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { AdminBrand } from "@arbyte/contracts";
import {
  Badge,
  Button,
  EmptyState,
  FormField,
  Input,
  Modal,
  Switch,
  Toast,
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

const t = dictionary.brands;

interface BrandFormState {
  name: string;
  slug: string;
  logoUrl: string;
  description: string;
  isActive: boolean;
  metaTitle: string;
  metaDescription: string;
  canonical: string;
}

function toFormState(brand?: AdminBrand): BrandFormState {
  return {
    name: brand?.name ?? "",
    slug: brand?.slug ?? "",
    logoUrl: brand?.logoUrl ?? "",
    description: brand?.description ?? "",
    isActive: brand?.isActive ?? true,
    metaTitle: brand?.seo?.metaTitle ?? "",
    metaDescription: brand?.seo?.metaDescription ?? "",
    canonical: brand?.seo?.canonical ?? "",
  };
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminBrand | null>(null);
  const [form, setForm] = useState<BrandFormState>(toFormState());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminBrand | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const load = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiGet<AdminBrand[]>("/admin/brands");
      setBrands(data);
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

  const openEdit = (brand: AdminBrand) => {
    setEditing(brand);
    setForm(toFormState(brand));
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
        logoUrl: form.logoUrl || undefined,
        description: form.description || undefined,
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
        await apiPatch<AdminBrand>(`/admin/brands/${editing.id}`, body);
        showToast("برند ویرایش شد.");
      } else {
        await apiPost<AdminBrand>("/admin/brands", body);
        showToast("برند ساخته شد.");
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
      await apiDelete(`/admin/brands/${deleteTarget.id}`);
      setDeleteTarget(null);
      showToast("برند حذف شد.");
      await load();
    } catch (err) {
      setDeleteError(err instanceof ApiClientError ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  };

  const columns: DataTableColumn<AdminBrand>[] = [
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
      ) : !loading && brands.length === 0 ? (
        <EmptyState
          title={t.emptyStateTitle}
          action={<Button onClick={openCreate}>{t.emptyStateAction}</Button>}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={brands}
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
          <FormField label={t.form.logoUrlLabel}>
            <Input
              dir="ltr"
              className="text-end"
              value={form.logoUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, logoUrl: e.target.value }))
              }
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
