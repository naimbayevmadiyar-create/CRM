import { cn } from "@/lib/format";

/**
 * Заглушка на время загрузки. Повторяет форму настоящего содержимого,
 * поэтому при появлении данных ничего не прыгает.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("skeleton rounded-[var(--radius-card)] bg-surface2", className)}
    />
  );
}

export function SkeletonPage({
  title = true,
  rows = 4,
  rowHeight = "h-24",
}: {
  title?: boolean;
  rows?: number;
  rowHeight?: string;
}) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Загрузка">
      {title && <Skeleton className="h-8 w-48" />}
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={rowHeight} />
      ))}
    </div>
  );
}
