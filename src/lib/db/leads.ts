import "server-only";
import { db } from "@/lib/supabase";
import type { Source } from "@/lib/source";
import type { LeadChannel } from "@/types/db";

export type Lead = {
  id: string;
  created_at: string;
  channel: LeadChannel;
  source: Source;
  page_anchor: string | null;
  utm_campaign: string | null;
  order_id: string | null;
};

const COLUMNS = "id, created_at, channel, source, page_anchor, utm_campaign, order_id";

export async function insertLead(input: {
  channel: LeadChannel;
  source: Source;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_term?: string | null;
  utm_content?: string | null;
  gclid?: string | null;
  page_anchor?: string | null;
  referrer?: string | null;
  user_agent?: string | null;
  ip_hash?: string | null;
}): Promise<void> {
  const { error } = await db().from("leads").insert(input);
  if (error) throw error;
}

/** Обращения, которые диспетчер ещё не превратил в заявку. */
export async function listUnprocessedLeads(limit = 30): Promise<Lead[]> {
  const { data, error } = await db()
    .from("leads")
    .select(COLUMNS)
    .is("order_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as Lead[];
}

/**
 * Сколько обращений с этого адреса за последние N секунд.
 * Отдельная таблица счётчиков не нужна: строки обращений и так пишутся.
 */
export async function countRecentByIp(ipHash: string, seconds: number): Promise<number> {
  const since = new Date(Date.now() - seconds * 1000).toISOString();

  const { count, error } = await db()
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);

  if (error) throw error;
  return count ?? 0;
}

export async function attachLeadToOrder(leadId: string, orderId: string): Promise<void> {
  const { error } = await db().from("leads").update({ order_id: orderId }).eq("id", leadId);
  if (error) throw error;
}
