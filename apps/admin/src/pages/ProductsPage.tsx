import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Package } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Input, Select } from "@/components/ui/Field";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/Stateviews";
import { listBrands, listCategories, listProducts } from "@/lib/catalogApi";
import { formatPrice } from "@/lib/formatters";
import { useQueryFilters } from "@/lib/useQueryFilters";
import { CONDITION_LABELS, type ProductCondition } from "@/types/catalog";

const PAGE_SIZE = 20;

export default function ProductsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useQueryFilters({
    page: "1",
    search: "",
    category: "",
    brand: "",
    status: "",
    condition: "",
    stock: "",
  });
  const page = Number(filters.page) || 1;
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["products", filters],
    queryFn: () =>
      listProducts({
        page,
        pageSize: PAGE_SIZE,
        search: filters.search || undefined,
        category: filters.category || undefined,
        brand: filters.brand || undefined,
        status: filters.status || undefined,
        condition: filters.condition || undefined,
        stock: filters.stock || undefined,
      }),
  });
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => listCategories(),
  });
  const { data: brands } = useQuery({
    queryKey: ["brands"],
    queryFn: () => listBrands(),
  });
  const products = data?.results ?? [];

  const priceRange = (min: number | null, max: number | null) =>
    min == null
      ? "—"
      : min === max
        ? formatPrice(min)
        : `${formatPrice(min)} تا ${formatPrice(max ?? min)}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="محصولات"
        description="هر محصول یک یا چند واریانت دارد؛ قیمت، SKU و موجودی روی واریانت است."
        actions={
          <Button onClick={() => navigate("/products/new")}>
            + محصول جدید
          </Button>
        }
      />
      <section className="glass-card overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] px-6 py-4">
          <Input
            className="w-56"
            placeholder="نام محصول یا SKU…"
            defaultValue={filters.search}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              setFilters({
                search: (e.target as HTMLInputElement).value,
                page: "1",
              })
            }
            onBlur={(e) => setFilters({ search: e.target.value, page: "1" })}
          />
          <Select
            className="w-auto"
            value={filters.category}
            onChange={(e) =>
              setFilters({ category: e.target.value, page: "1" })
            }
          >
            <option value="">همه‌ی دسته‌ها</option>
            {categories?.results.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            className="w-auto"
            value={filters.brand}
            onChange={(e) => setFilters({ brand: e.target.value, page: "1" })}
          >
            <option value="">همه‌ی برندها</option>
            {brands?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <Select
            className="w-auto"
            value={filters.condition}
            onChange={(e) =>
              setFilters({ condition: e.target.value, page: "1" })
            }
          >
            <option value="">همه‌ی شرایط</option>
            {Object.entries(CONDITION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
          <Select
            className="w-auto"
            value={filters.status}
            onChange={(e) => setFilters({ status: e.target.value, page: "1" })}
          >
            <option value="">همه‌ی وضعیت‌ها</option>
            <option value="ACTIVE">فعال</option>
            <option value="INACTIVE">غیرفعال</option>
          </Select>
          <Select
            className="w-auto"
            value={filters.stock}
            onChange={(e) => setFilters({ stock: e.target.value, page: "1" })}
          >
            <option value="">همه‌ی موجودی‌ها</option>
            <option value="in">موجود</option>
            <option value="low">زیر آستانه</option>
            <option value="out">ناموجود</option>
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
            description="فیلترها را تغییر دهید یا محصول جدید بسازید."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[48rem] text-start text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] text-slate-500">
                    <th className="px-6 py-3 font-medium">محصول</th>
                    <th className="px-4 py-3 font-medium">شرایط</th>
                    <th className="px-4 py-3 font-medium">واریانت</th>
                    <th className="px-4 py-3 font-medium">قیمت</th>
                    <th className="px-4 py-3 font-medium">موجودی</th>
                    <th className="px-4 py-3 font-medium">وضعیت</th>
                  </tr>
                </thead>
                {isPending ? (
                  <TableSkeleton rows={6} cols={6} />
                ) : (
                  <tbody className="divide-y divide-white/[0.04]">
                    {products.map((p) => (
                      <tr
                        key={p.id}
                        className="cursor-pointer transition-colors hover:bg-white/[0.02]"
                        onClick={() => navigate(`/products/${p.id}`)}
                      >
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-800/60">
                              {p.primaryImage && (
                                <img
                                  src={p.primaryImage}
                                  alt=""
                                  className="size-full object-cover"
                                />
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="m-0 truncate font-semibold text-white">
                                {p.name}
                              </p>
                              <p className="m-0 text-[11px] text-slate-500">
                                {p.brand.name} · {p.category.name}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {CONDITION_LABELS[p.condition as ProductCondition]}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {p.variantsCount.toLocaleString("fa-IR")}
                        </td>
                        <td className="px-4 py-3 text-slate-200">
                          {priceRange(p.priceMin, p.priceMax)}
                        </td>
                        <td className="px-4 py-3">
                          <Chip
                            tone={
                              (p.stockAvailable ?? 0) > 0 ? "success" : "danger"
                            }
                          >
                            {(p.stockAvailable ?? 0).toLocaleString("fa-IR")}
                          </Chip>
                        </td>
                        <td className="px-4 py-3">
                          <Chip
                            tone={p.status === "ACTIVE" ? "brand" : "neutral"}
                          >
                            {p.status === "ACTIVE" ? "فعال" : "غیرفعال"}
                          </Chip>
                        </td>
                      </tr>
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
    </div>
  );
}
