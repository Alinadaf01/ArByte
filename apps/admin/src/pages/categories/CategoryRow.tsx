import { Chip } from "@/components/ui/Chip";
import type { AdminCategory } from "@/types/category";

export function CategoryRow({
  category,
  isChild,
  onEdit,
  onDelete,
}: {
  category: AdminCategory;
  isChild: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <tr>
      <td className="px-6 py-3">
        <div
          className="flex items-center gap-3"
          style={isChild ? { paddingInlineStart: "1.75rem" } : undefined}
        >
          {isChild && <span className="text-slate-600">└</span>}
          <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-800/60 text-xs text-slate-500">
            {category.image ? (
              <img
                src={category.image}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
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
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 8.25V18a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 18V8.25m-18 0V6a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 6v2.25m-18 0h18"
                />
              </svg>
            )}
          </span>
          <div>
            <p className="m-0 font-semibold text-white">{category.name}</p>
            <p className="m-0 text-[11px] text-slate-500" dir="ltr">
              {category.slug}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-slate-300">
        {category.order.toLocaleString("fa-IR")}
      </td>
      <td className="px-4 py-3">
        <Chip tone={category.isActive ? "success" : "neutral"} dot>
          {category.isActive ? "فعال" : "غیرفعال"}
        </Chip>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            aria-label="ویرایش"
            className="icon-btn !h-8 !w-8"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.8"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="حذف"
            className="icon-btn !h-8 !w-8 hover:!text-danger"
          >
            <svg
              className="h-4 w-4"
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
        </div>
      </td>
    </tr>
  );
}
