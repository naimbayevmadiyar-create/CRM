import { Skeleton, SkeletonPage } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Загрузка аналитики">
      <Skeleton className="h-8 w-40" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <SkeletonPage title={false} rows={1} rowHeight="h-80" />
    </div>
  );
}
