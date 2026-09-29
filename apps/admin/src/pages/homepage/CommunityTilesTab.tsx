import { useRef, useState, type DragEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Input, Switch } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/Stateviews";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/cn";
import { useToast } from "@/lib/ToastContext";
import {
  createCommunityTile,
  deleteCommunityTile,
  listCommunityTiles,
  updateCommunityTile,
} from "@/lib/api";
import type { CommunityTileData } from "@/types/homepage";

const MAX_TILES = 6;

export function CommunityTilesTab() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CommunityTileData | null>(
    null,
  );

  const {
    data: tiles,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["homepage-community-tiles"],
    queryFn: listCommunityTiles,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["homepage-community-tiles"] });

  const createMutation = useMutation({
    mutationFn: (file: File) =>
      createCommunityTile((tiles?.length ?? 0) + 1, file),
    onSuccess: () => {
      invalidate();
      toast.showSuccess("کاشی افزوده شد.");
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "افزودن کاشی ناموفق بود.",
      ),
  });

  const patchMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<
        Pick<CommunityTileData, "order" | "imageAlt" | "linkUrl" | "isActive">
      >;
    }) => updateCommunityTile(id, data),
    onSuccess: () => invalidate(),
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "ذخیره ناموفق بود.",
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCommunityTile(id),
    onSuccess: () => {
      invalidate();
      setDeleteTarget(null);
      toast.showSuccess("کاشی حذف شد.");
    },
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "حذف ناموفق بود.",
      ),
  });

  if (isError)
    return (
      <ErrorState
        description="دریافت کاشی‌های جامعه ناموفق بود."
        onRetry={() => refetch()}
      />
    );
  if (isPending || !tiles) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full" />
        ))}
      </div>
    );
  }

  const sorted = [...tiles].sort((a, b) => a.order - b.order);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) createMutation.mutate(file);
    e.target.value = "";
  }

  function handleDrop(targetId: string) {
    setOverId(null);
    if (!dragId || dragId === targetId) return;
    const ids = sorted.map((t) => t.id);
    const fromIndex = ids.indexOf(dragId);
    const toIndex = ids.indexOf(targetId);
    ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, dragId);
    ids.forEach((id, index) => {
      const tile = sorted.find((t) => t.id === id);
      if (tile && tile.order !== index + 1) {
        patchMutation.mutate({ id, data: { order: index + 1 } });
      }
    });
    setDragId(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 text-xs text-slate-500">
        اگر هیچ کاشی فعالی وجود نداشته باشد، بخش «جامعه» در صفحه اصلی نمایش داده
        نمی‌شود. ابعاد پیشنهادی: ۱۰۰۰×۱۰۰۰ (مربع).
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {sorted.map((tile) => (
          <div
            key={tile.id}
            draggable
            onDragStart={() => setDragId(tile.id)}
            onDragOver={(e: DragEvent<HTMLDivElement>) => {
              e.preventDefault();
              setOverId(tile.id);
            }}
            onDragLeave={() =>
              setOverId((prev) => (prev === tile.id ? null : prev))
            }
            onDrop={() => handleDrop(tile.id)}
            className={cn(
              "group flex cursor-move flex-col gap-2 rounded-xl border border-white/[0.06] bg-ink-800/60 p-2",
              overId === tile.id &&
                "border-brand-500/50 ring-2 ring-brand-500/30",
              !tile.isActive && "opacity-60",
            )}
          >
            <div className="relative aspect-square overflow-hidden rounded-lg bg-ink-900/60">
              {tile.image && (
                <img
                  src={tile.image}
                  alt={tile.imageAlt}
                  className="h-full w-full object-cover"
                />
              )}
              <button
                type="button"
                onClick={() => setDeleteTarget(tile)}
                aria-label="حذف کاشی"
                className="absolute end-2 top-2 grid size-7 place-items-center rounded-lg bg-ink-950/80 text-slate-300 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <Input
              placeholder="لینک (اختیاری)"
              dir="ltr"
              defaultValue={tile.linkUrl}
              onBlur={(e) => {
                if (e.target.value !== tile.linkUrl) {
                  patchMutation.mutate({
                    id: tile.id,
                    data: { linkUrl: e.target.value },
                  });
                }
              }}
              className="!py-1.5 !text-xs"
            />
            <Switch
              checked={tile.isActive}
              onChange={(v) =>
                patchMutation.mutate({ id: tile.id, data: { isActive: v } })
              }
              label="فعال"
            />
          </div>
        ))}

        {sorted.length < MAX_TILES && (
          <button
            type="button"
            disabled={createMutation.isPending}
            onClick={() => inputRef.current?.click()}
            className="grid aspect-square place-items-center rounded-xl border border-dashed border-white/15 text-slate-500 transition-all duration-300 hover:border-brand-500/40 hover:text-brand-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="flex flex-col items-center gap-1.5 text-xs font-semibold">
              <svg
                className="size-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.8"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              {createMutation.isPending ? "در حال آپلود…" : "افزودن کاشی"}
            </span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title="حذف کاشی"
        description="این کاشی از بخش جامعه در صفحه اصلی حذف می‌شود."
        confirmLabel="حذف"
        pending={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
