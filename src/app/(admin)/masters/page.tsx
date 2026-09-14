import type { Metadata } from "next";
import { listMasters } from "@/lib/db/profiles";
import { getDefaultSharePercent } from "@/lib/db/settings";
import { MastersView } from "./MastersView";

export const metadata: Metadata = { title: "Мастера" };

export default async function MastersPage() {
  // false — показываем и отключённых, их нужно уметь включить обратно
  const [masters, defaultSharePercent] = await Promise.all([
    listMasters(false),
    getDefaultSharePercent(),
  ]);

  return <MastersView masters={masters} defaultSharePercent={defaultSharePercent} />;
}
