import "server-only";
import { db } from "@/lib/supabase";

/**
 * Выплаты партнёру.
 *
 * Доля начисляется от чистой прибыли, а отдают её частями — нужен остаток:
 * начислено столько-то, выплачено столько-то, должны столько-то.
 */
export type Payout = {
  id: string;
  paid_on: string;
  amount: number;
  note: string | null;
};

const COLUMNS = "id, paid_on, amount, note";

export async function listPayouts(from: string, to: string): Promise<Payout[]> {
  const { data, error } = await db()
    .from("partner_payouts")
    .select(COLUMNS)
    .gte("paid_on", from)
    .lte("paid_on", to)
    .order("paid_on", { ascending: false })
    .limit(500);

  if (error) throw error;
  return (data ?? []) as Payout[];
}

export async function addPayout(input: {
  paid_on: string;
  amount: number;
  note?: string | null;
  created_by?: string;
}): Promise<void> {
  const { error } = await db().from("partner_payouts").insert({
    paid_on: input.paid_on,
    amount: input.amount,
    note: input.note?.trim() || null,
    created_by: input.created_by ?? null,
  });
  if (error) throw error;
}

export async function deletePayout(id: string): Promise<void> {
  const { error } = await db().from("partner_payouts").delete().eq("id", id);
  if (error) throw error;
}

export function payoutsTotal(payouts: Payout[]): number {
  return payouts.reduce((sum, row) => sum + row.amount, 0);
}
