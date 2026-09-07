/**
 * Расчёт по закрытому заказу.
 *
 * Мастер вводит только два числа — сколько согласовал с клиентом и сколько
 * потратил на запчасти. Всё остальное считается здесь: человеку на морозе
 * арифметику не доверяем, иначе опечатка превращается в спор о деньгах.
 *
 * Пример из практики сервиса:
 *   согласовано 80 000 − расход 13 500 = чистыми 66 500
 *   доля компании 50%  = 33 250 в кассу
 *
 * Направление расчёта зависит от того, куда пришли деньги:
 *   наличные — они у мастера, он вносит долю компании;
 *   на счёт  — они уже у компании, и она возвращает мастеру его долю
 *              плюс потраченное на запчасти (запчасти мастер покупает сам).
 */

export const PAYMENT_METHODS = ["cash", "transfer"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "Наличными",
  transfer: "На счёт",
};

export const MAX_SHARE_PERCENT = 100;
export const DEFAULT_SHARE_PERCENT = 50;

export type SettlementInput = {
  /** Согласовано с клиентом. */
  total: number;
  /** Потрачено на запчасти. */
  expenses: number;
  /** Доля компании от чистых, в процентах. */
  sharePercent: number;
  paymentMethod: PaymentMethod;
};

export type Settlement = {
  net: number;
  companyCut: number;
  masterCut: number;
  sharePercent: number;
  /** Кто кому должен по итогу. */
  direction: "master_owes" | "company_owes";
  /** Сколько именно должен — всегда положительное число. */
  amount: number;
  /** Расход превысил согласованное: заказ ушёл в минус. */
  isLoss: boolean;
};

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SHARE_PERCENT;
  return Math.min(MAX_SHARE_PERCENT, Math.max(0, Math.round(value)));
}

export function calcSettlement(input: SettlementInput): Settlement {
  const total = Math.trunc(input.total) || 0;
  const expenses = Math.trunc(input.expenses) || 0;
  const sharePercent = clampPercent(input.sharePercent);

  const net = total - expenses;

  // долю мастера считаем вычитанием, а не вторым округлением:
  // так суммы всегда сходятся и тенге не теряется
  const companyCut = Math.round((net * sharePercent) / 100);
  const masterCut = net - companyCut;

  const direction = input.paymentMethod === "cash" ? "master_owes" : "company_owes";
  const amount =
    direction === "master_owes"
      ? Math.max(0, companyCut)
      : Math.max(0, masterCut + expenses);

  return {
    net,
    companyCut,
    masterCut,
    sharePercent,
    direction,
    amount,
    isLoss: net < 0,
  };
}
