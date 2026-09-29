import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Pagination } from "@/components/ui/Pagination";
import { ProductRow } from "@/pages/products/ProductRow";
import { listProducts, listCategories, deleteProduct } from "@/lib/api";
import { useQueryFilters } from "@/lib/useQueryFilters";
import { useToast } from "@/lib/ToastContext";
import { PRODUCTION_STATUS_LABELS } from "@/lib/productSchema";
import type { AdminProduct } from "@/types/product";

const PAGE_SIZE = 12;

export default function ProductsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [filters, setFilters] = useQueryFilters({
    page: "1",
    category: "",
    search: "",
    isActive: "",
    productionStatus: "",
    inStock: "",
    ordering: "",
  });
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);
  const page = Number(filters.page) || 1;

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories({ pageSize: 100 }),
  });
  const categoryList = useMemo(() => categories?.results ?? [], [categories]);
  const categoriesById = useMemo(
    () => new Map(categoryList.map((c) => [c.id, c])),
    [categoryList],
  );

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["products", filters],
    queryFn: () =>
      listProducts({
        page,
        pageSize: PAGE_SIZE,
        category: filters.category || undefined,
        search: filters.search || undefined,
        isActive: filters.isActive || undefined,
        productionStatus: filters.productionStatus || undefined,
        inStock: filters.inStock || undefined,
        ordering: filters.ordering || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.showSuccess("محصول حذف شد.");
      setDeleteTarget(null);
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "حذف ناموفق بود.",
      ),
  });

  const products = data?.results ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="محصولات"
        description="لیست محصولات با جستجو و فیلتر، و فرم افزودن/ویرایش با تصاویر و رنگ‌ها."
        actions={
          <Button onClick={() => navigate("/products/new")}>
            + افزودن محصول
          </Button>
        }
      />

      <section className="glass-card overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-6 py-4">
          <Input
            className="w-56"
            placeholder="جستجوی نام یا کد کالا…"
            defaultValue={filters.search}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                setFilters({
                  search: (e.target as HTMLInputElement).value,
                  page: "1",
                });
            }}
            onBlur={(e) => setFilters({ search: e.target.value, page: "1" })}
          />
          <Select
            className="w-auto"
            value={filters.category}
            onChange={(e) =>
              setFilters({ category: e.target.value, page: "1" })
            }
          >
            <option value="">همه دسته‌بندی‌ها</option>
            {categoryList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            className="w-auto"
            value={filters.isActive}
            onChange={(e) =>
              setFilters({ isActive: e.target.value, page: "1" })
            }
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="true">فعال</option>
            <option value="false">غیرفعال</option>
          </Select>
          <Select
            className="w-auto"
            value={filters.productionStatus}
            onChange={(e) =>
              setFilters({ productionStatus: e.target.value, page: "1" })
            }
          >
            <option value="">همه وضعیت‌های تولید</option>
            {Object.entries(PRODUCTION_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Select
            className="w-auto"
            value={filters.inStock}
            onChange={(e) => setFilters({ inStock: e.target.value, page: "1" })}
          >
            <option value="">همه موجودی‌ها</option>
            <option value="true">موجود</option>
            <option value="false">ناموجود</option>
          </Select>
          <Select
            className="w-auto"
            value={filters.ordering}
            onChange={(e) =>
              setFilters({ ordering: e.target.value, page: "1" })
            }
          >
            <option value="">مرتب‌سازی پیش‌فرض</option>
            <option value="price">قیمت: کم به زیاد</option>
            <option value="-price">قیمت: زیاد به کم</option>
            <option value="stockCount">موجودی: کم به زیاد</option>
            <option value="-stockCount">موجودی: زیاد به کم</option>
          </Select>
        </div>

        {isError ? (
          <ErrorState
            description="دریافت محصولات ناموفق بود."
            onRetry={() => refetch()}
          />
        ) : !isPending && products.length === 0 ? (
          <EmptyState
            icon={Package}
            title="محصولی یافت نشد"
            description="با فیلترهای فعلی محصولی پیدا نشد، یا هنوز محصولی ثبت نشده."
            action={
              <Button onClick={() => navigate("/products/new")}>
                + افزودن محصول
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] text-start text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                    <th className="px-6 py-3 font-medium">محصول</th>
                    <th className="px-4 py-3 font-medium">دسته‌بندی</th>
                    <th className="px-4 py-3 font-medium">قیمت</th>
                    <th className="px-4 py-3 font-medium">موجودی</th>
                    <th className="px-4 py-3 font-medium">وضعیت</th>
                    <th className="px-4 py-3 font-medium">عملیات</th>
                  </tr>
                </thead>
                {isPending ? (
                  <TableSkeleton rows={6} cols={6} />
                ) : (
                  <tbody className="divide-y divide-white/[0.04]">
                    {products.map((product) => (
                      <ProductRow
                        key={product.id}
                        product={product}
                        categoriesById={categoriesById}
                        onDelete={() => setDeleteTarget(product)}
                      />
                    ))}
                  </tbody>
                )}
              </table>
            </div>
            {data && (
              <Pagination
                page={page}
                pageSize={PAGE_SIZE}
                count={data.count}
                onPageChange={(p) => setFilters({ page: String(p) })}
              />
            )}
          </>
        )}
      </section>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`حذف «${deleteTarget?.name ?? ""}»`}
        description="این عملیات قابل بازگشت نیست."
        confirmLabel="حذف"
        pending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
