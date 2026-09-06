/**
 * Машина этапов заявки.
 *
 * Живёт отдельно от React и от базы: это единственное место, где записано,
 * какие переходы вообще возможны. И экран мастера, и админка, и серверные
 * действия спрашивают разрешение здесь.
 */

export const STATUSES = [
  "new",
  "assigned",
  "on_the_way",
  "in_progress",
  "done",
  "canceled",
] as const;

export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  new: "Новая",
  assigned: "Назначена",
  on_the_way: "В пути",
  in_progress: "В работе",
  done: "Выполнена",
  canceled: "Отменена",
};

/** Этапы, которые считаются «в работе»: их видит мастер и по ним живёт доска. */
export const ACTIVE_STATUSES: Status[] = ["new", "assigned", "on_the_way", "in_progress"];

/** Единственный разрешённый переход вперёд с каждого этапа. */
const FORWARD: Record<Status, Status | null> = {
  new: "assigned",
  assigned: "on_the_way",
  on_the_way: "in_progress",
  in_progress: "done",
  done: null,
  canceled: null,
};

const CANCELABLE: Status[] = ["new", "assigned", "on_the_way", "in_progress"];

export function canTransition(from: Status, to: Status): boolean {
  if (from === to) return false;
  if (to === "canceled") return CANCELABLE.includes(from);
  return FORWARD[from] === to;
}

/**
 * Три шага мастера. С «Новой» кнопки нет намеренно: пока диспетчер
 * не назначил исполнителя, заявка не его.
 */
const MASTER_STEPS: Partial<Record<Status, { next: Status; label: string }>> = {
  assigned: { next: "on_the_way", label: "Выехал" },
  on_the_way: { next: "in_progress", label: "На месте" },
  in_progress: { next: "done", label: "Готово" },
};

export function nextForMaster(from: Status): Status | null {
  return MASTER_STEPS[from]?.next ?? null;
}

export function masterButtonLabel(from: Status): string | null {
  return MASTER_STEPS[from]?.label ?? null;
}
