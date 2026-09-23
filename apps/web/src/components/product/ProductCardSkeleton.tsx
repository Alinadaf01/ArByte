import { Card, Skeleton } from "@arbyte/ui";

/** همان ابعاد `ProductCard` — تا موقع بارگذاری صفحه نلرزد (بند ۵.۴۶/۴.۴۹). */
export function ProductCardSkeleton() {
  return (
    <Card
      variant="flat"
      padding={false}
      className="flex h-full flex-col overflow-hidden"
    >
      <Skeleton shape="rect" className="aspect-[4/3] w-full rounded-none" />

      <div className="flex flex-1 flex-col gap-3 p-4">
        <Skeleton shape="text" className="h-6 w-20 rounded-chip" />
        <Skeleton shape="text" className="h-6 w-4/5" />
        <Skeleton shape="text" className="h-4 w-3/5" />

        <div className="mt-auto flex flex-col gap-3 pt-1">
          <Skeleton shape="text" className="h-6 w-2/5" />
          <div className="flex items-center justify-between gap-3">
            <Skeleton shape="text" className="h-6 w-24 rounded-chip" />
            <Skeleton shape="text" className="h-9 w-28 rounded-pill" />
          </div>
        </div>
      </div>
    </Card>
  );
}
