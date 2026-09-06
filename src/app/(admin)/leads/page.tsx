import { listUnprocessedLeads } from "@/lib/db/leads";
import { LeadsView } from "./LeadsView";

export default async function LeadsPage() {
  const leads = await listUnprocessedLeads(30);
  return <LeadsView leads={leads} />;
}
