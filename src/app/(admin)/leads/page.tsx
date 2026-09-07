import type { Metadata } from "next";
import { listUnprocessedLeads } from "@/lib/db/leads";
import { AutoRefresh } from "@/components/AutoRefresh";
import { LeadsView } from "./LeadsView";

export const metadata: Metadata = { title: "Обращения" };

export default async function LeadsPage() {
  const leads = await listUnprocessedLeads(30);
  return (
    <>
      <AutoRefresh seconds={60} />
      <LeadsView leads={leads} />
    </>
  );
}
