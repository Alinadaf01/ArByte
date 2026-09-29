import { useNavigate } from "react-router-dom";
import { Chip } from "@/components/ui/Chip";
import { formatPrice } from "@/lib/formatters";
import { PRODUCTION_STATUS_LABELS } from "@/lib/productSchema";
import type { AdminProduct } from "@/types/product";
import type { AdminCategory } from "@/types/category";

export function ProductRow({
  product,
  categoriesById,
  onDelete,
}: {
  product: AdminProduct;
  categoriesById: Map<string, AdminCategory>;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  const primaryImage = [...product.images].sort((a, b) => a.order - b.order)[0];

  return (
    <tr
      className="cursor-pointer transition-colors hover:bg-white/[0.02]"
      onClick={() => navigate(`/products/${product.id}`)}
    >
      <td className="px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-800/60">
            {primaryImage ? (
              <img
                src={primaryImage.image}
                alt={primaryImage.alt}
                className="size-full object-cover"
              />
            ) : (
              <svg
                className="size-4 text-slate-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.8"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 8.25V18a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 18V8.25m-18 0V6a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 6v2.25m-18 0h18"
                />
              </svg>
            )}
          </span>
          <div>
            <p className="m-0 font-semibold text-white">{product.name}</p>
            <p className="m-0 text-[11px] text-slate-500" dir="ltr">
              {product.sku}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-slate-400">
        {categoriesById.get(String(product.category))?.name ?? "—"}
      </td>
      <td className="px-4 py-3 font-bold text-white">
        {formatPrice(product.price)}
      </td>
      <td className="px-4 py-3">
        <span
          className={
            product.stockCount === 0
              ? "font-bold text-danger"
              : "font-bold text-white"
          }
        >
          {product.stockCount.toLocaleString("fa-IR")}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          <Chip tone={product.isActive ? "success" : "neutral"} dot>
            {product.isActive ? "فعال" : "غیرفعال"}
          </Chip>
          <Chip tone="neutral">
            {PRODUCTION_STATUS_LABELS[product.productionStatus]}
          </Chip>
        </div>
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="حذف"
          className="icon-btn !h-8 !w-8 hover:!text-danger"
        >
          <svg
            className="size-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.8"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
            />
          </svg>
        </button>
      </td>
    </tr>
  );
}
