import { Chip } from "@/components/ui/Chip";
import { INPUT_TYPE_LABELS } from "@/lib/attributeSchema";
import type { Attribute } from "@/types/attribute";
import type { AdminCategory } from "@/types/category";

export function AttributeRow({
  attribute,
  categoriesById,
  onEdit,
  onManageValues,
  onDelete,
}: {
  attribute: Attribute;
  categoriesById: Map<string, AdminCategory>;
  onEdit: () => void;
  onManageValues: () => void;
  onDelete: () => void;
}) {
  return (
    <tr>
      <td className="px-6 py-3">
        <p className="m-0 font-semibold text-white">{attribute.name}</p>
        <p className="m-0 text-[11px] text-slate-500" dir="ltr">
          {attribute.slug}
          {attribute.unit && ` · ${attribute.unit}`}
        </p>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {attribute.categories.map((id) => (
            <Chip key={id} tone="neutral">
              {categoriesById.get(String(id))?.name ?? `#${id}`}
            </Chip>
          ))}
        </div>
      </td>
      <td className="px-4 py-3">
        <Chip tone="brand">{INPUT_TYPE_LABELS[attribute.inputType]}</Chip>
      </td>
      <td className="px-4 py-3">
        <Chip tone={attribute.isRequired ? "warning" : "neutral"}>
          {attribute.isRequired ? "الزامی" : "اختیاری"}
        </Chip>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          {attribute.inputType === "select" && (
            <button
              type="button"
              onClick={onManageValues}
              className="icon-btn !h-8 !w-8"
              aria-label="مقادیر"
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
                  d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm0 5.25h.007v.008H3.75v-.008zm0 5.25h.007v.008H3.75v-.008z"
                />
              </svg>
            </button>
          )}
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
