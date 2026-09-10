/**
 * Расчёт по закрытому заказу.
 *
 * Мастер вводит два числа — сколько согласовал с клиентом и сколько ушло
 * на запчасти. Всё остальное считается здесь: человеку на морозе арифметику
 * не доверяем, иначе опечатка превращается в спор о деньгах.
 *
 * Запчасти покупает компания. Значит расход — её деньги, и возмещать
 * мастеру нечего: делится только то, что осталось после запчастей.
 *
 * Пример из практики сервиса:
 *   согласовано 80 000 − запчасти 13 500 = чистыми 66 500
 *   доля компании 50% = 33 250, столько же остаётся мастеру
 *
 * Дальше зависит от того, где физически лежат деньги:
 *
 *   наличными — все 80 000 собрал мастер, своих денег он не тратил.
 *               Себе оставляет свою долю 33 250, вносит 46 750:
 *               долю компании плюс её же деньги за запчасти.
 *
 *   на счёт   — все 80 000 у компании, запчасти она оплатила сама.
 *               Мастеру причитается только его доля — 33 250.
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
  /** Потрачено на запчасти. Деньги компании. */
  expenses: number;
  /** Доля компании от чистых, в процентах. */
  sharePercent: number;
  paymentMethod: PaymentMethod;
};

export type Settlement = {
  net: number;
  /** Прибыль компании. */
  companyCut: number;
  /** Заработок мастера. */
  masterCut: number;
  sharePercent: number;
  /** Кто кому должен по итогу. */
  direction: "master_owes" | "company_owes";
  /** Сколько именно должен — всегда положительное число. */
  amount: number;
  /** Запчасти дороже согласованного: заказ ушёл в минус. */
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
  const masterCut = Math.max(0, net - companyCut);

  const direction = input.paymentMethod === "cash" ? "master_owes" : "company_owes";

  const amount =
    direction === "master_owes"
      ? // всё собранное, кроме заработка мастера: запчасти возвращаются компании
        Math.max(0, total - masterCut)
      : masterCut;

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
