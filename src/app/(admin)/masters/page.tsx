import { listMasters } from "@/lib/db/profiles";
import { MastersView } from "./MastersView";

export default async function MastersPage() {
  // false — показываем и отключённых, их нужно уметь включить обратно
  const masters = await listMasters(false);
  return <MastersView masters={masters} />;
}
