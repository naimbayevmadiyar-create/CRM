import { STATUS_LABEL, type Status } from "@/lib/status";
import { cn } from "@/lib/format";

/**
 * Этап различается подписью и цветом одновременно. Только цветом нельзя:
 * экран смотрят на солнце, и не все различают оттенки.
 */
const TONE: Record<Status, string> = {
  new: "bg-surface2 text-text",
  assigned: "bg-primary/12 text-primary",
  on_the_way: "bg-warning/12 text-warning",
  in_progress: "bg-warning/20 text-warning",
  done: "bg-success/12 text-success",
  canceled: "bg-danger/12 text-danger",
};

export function StatusPill({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium",
        TONE[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
