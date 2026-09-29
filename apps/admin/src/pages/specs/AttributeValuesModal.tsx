import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { listAttributeValues, createAttributeValue } from "@/lib/api";
import { useToast } from "@/lib/ToastContext";
import type { Attribute } from "@/types/attribute";

export function AttributeValuesModal({
  attribute,
  onClose,
}: {
  attribute: Attribute | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [newValue, setNewValue] = useState("");

  const { data: values, isPending } = useQuery({
    queryKey: ["attribute-values", attribute?.id],
    queryFn: () => listAttributeValues(attribute!.id),
    enabled: !!attribute,
  });

  const mutation = useMutation({
    mutationFn: (value: string) => createAttributeValue(attribute!.id, value),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["attribute-values", attribute?.id],
      });
      setNewValue("");
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "افزودن مقدار ناموفق بود.",
      ),
  });

  if (!attribute) return null;

  return (
    <Modal
      open={!!attribute}
      onClose={onClose}
      title={`مقادیر «${attribute.name}»`}
    >
      <div className="flex flex-col gap-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newValue.trim()) mutation.mutate(newValue.trim());
          }}
          className="flex gap-2"
        >
          <Input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="مقدار جدید…"
            className="flex-1"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!newValue.trim() || mutation.isPending}
          >
            افزودن
          </Button>
        </form>

        {isPending ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : values && values.length > 0 ? (
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {values.map((v) => (
              <li
                key={v.id}
                className="rounded-lg border border-white/[0.06] bg-ink-800/40 px-3.5 py-2 text-sm text-slate-200"
              >
                {v.value}
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-4 text-center text-xs text-slate-500">
            هنوز مقداری تعریف نشده.
          </p>
        )}
      </div>
    </Modal>
  );
}
