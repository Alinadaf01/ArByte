import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageUploader } from "@/components/ui/ImageUploader";
import {
  uploadProductImage,
  patchProductImage,
  deleteProductImage,
} from "@/lib/api";
import { useToast } from "@/lib/ToastContext";
import type { ProductImage } from "@/types/product";

export function ProductImagesSection({
  productId,
  images,
}: {
  productId: string;
  images: ProductImage[];
}) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [uploading, setUploading] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["product", productId] });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const nextOrder =
        images.length > 0 ? Math.max(...images.map((i) => i.order)) + 1 : 1;
      return uploadProductImage(productId, file, nextOrder);
    },
    onMutate: () => setUploading(true),
    onSettled: () => setUploading(false),
    onSuccess: invalidate,
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "آپلود تصویر ناموفق بود.",
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (imageId: string) => deleteProductImage(productId, imageId),
    onSuccess: invalidate,
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "حذف تصویر ناموفق بود.",
      ),
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) =>
      Promise.all(
        orderedIds.map((id, index) =>
          patchProductImage(productId, id, { order: index + 1 }),
        ),
      ),
    onSuccess: invalidate,
    onError: (error: unknown) =>
      toast.showError(
        error instanceof Error ? error.message : "تغییر ترتیب ناموفق بود.",
      ),
  });

  return (
    <section className="glass-card p-6">
      <h2 className="m-0 text-sm font-bold text-white">تصاویر</h2>
      <p className="mt-1 text-xs text-slate-500">
        آپلود چندتایی، ترتیب با کشیدن قابل تغییر است.
      </p>
      <div className="mt-4">
        <ImageUploader
          images={images}
          uploading={uploading}
          onUpload={(file) => uploadMutation.mutate(file)}
          onDelete={(id) => deleteMutation.mutate(id)}
          onReorder={(ids) => reorderMutation.mutate(ids)}
        />
      </div>
    </section>
  );
}
