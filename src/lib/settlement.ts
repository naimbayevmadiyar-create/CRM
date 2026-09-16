/**
 * Расчёт по закрытому заказу.
 *
 * Мастер вводит два числа — сколько согласовал с клиентом и сколько ушло
 * на запчасти. Всё остальное считается здесь: человеку на морозе арифметику
 * не доверяем, иначе опечатка превращается в спор о деньгах.
 *
 * Делится всегда одно и то же — чистые, то есть согласованное минус запчасти.
 * А вот кто эти запчасти оплатил, меняет итог расчёта:
 *
 *   компания — расход её, возмещать мастеру нечего;
 *   мастер   — он купил детали из своих или из денег клиента, и эту сумму
 *              ему возвращают сверх его доли.
 *
 * Пример: согласовано 80 000 − запчасти 13 500 = чистыми 66 500,
 * пополам по 33 250.
 *
 *   наличными, запчасти компании — мастер собрал все 80 000. Себе оставляет
 *     33 250, вносит 46 750: долю компании плюс её же деньги за запчасти.
 *   наличными, запчасти мастера  — он уже потратился, поэтому вносит только
 *     долю компании 33 250, а 46 750 остаются у него.
 *   на счёт, запчасти компании   — деньги у компании, мастеру её доля 33 250.
 *   на счёт, запчасти мастера    — ему возвращают долю и потраченное:
 *     33 250 + 13 500 = 46 750.
 */

export const PAYMENT_METHODS = ["cash", "transfer"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "Наличными",
  transfer: "На счёт",
};

export const EXPENSES_PAYERS = ["company", "master"] as const;
export type ExpensesPayer = (typeof EXPENSES_PAYERS)[number];

export const EXPENSES_PAYER_LABEL: Record<ExpensesPayer, string> = {
  company: "Купила компания",
  master: "Купил мастер",
};

export const MAX_SHARE_PERCENT = 100;
export const DEFAULT_SHARE_PERCENT = 50;

export type SettlementInput = {
  /** Согласовано с клиентом. */
  total: number;
  /** Потрачено на запчасти. */
  expenses: number;
  /** Чьи это были деньги. */
  expensesPayer?: ExpensesPayer;
  /** Доля компании от чистых, в процентах. */
  sharePercent: number;
  paymentMethod: PaymentMethod;
};

export type Settlement = {
  net: number;
  /** Прибыль компании. */
  companyCut: number;
  /** Заработок мастера, без учёта возврата за запчасти. */
  masterCut: number;
  sharePercent: number;
  /** Кто кому должен по итогу. */
  direction: "master_owes" | "company_owes";
  /** Сколько именно должен — всегда положительное число. */
  amount: number;
  /** Сколько мастеру возвращают за купленные им детали. */
  reimbursement: number;
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
  const payer: ExpensesPayer = input.expensesPayer ?? "company";

  const net = total - expenses;

  // долю мастера считаем вычитанием, а не вторым округлением:
  // так суммы всегда сходятся и тенге не теряется
  const companyCut = Math.round((net * sharePercent) / 100);
  const masterCut = Math.max(0, net - companyCut);

  // мастеру возвращают только то, что он потратил сам
  const reimbursement = payer === "master" ? Math.min(expenses, total) : 0;

  const direction = input.paymentMethod === "cash" ? "master_owes" : "company_owes";

  const amount =
    direction === "master_owes"
      ? // всё собранное, кроме заработка мастера и его же затрат на детали
        Math.max(0, total - masterCut - reimbursement)
      : masterCut + reimbursement;

  return {
    net,
    companyCut,
    masterCut,
    sharePercent,
    direction,
    amount,
    reimbursement,
    isLoss: net < 0,
  };
}
