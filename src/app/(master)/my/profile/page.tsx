import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireMaster } from "@/lib/auth";
import { getMasterSignature, getProfile } from "@/lib/db/profiles";
import { SignatureForm } from "./SignatureForm";

export const metadata: Metadata = { title: "Моя подпись" };

/**
 * Подпись мастера.
 *
 * Расписываться на каждом экземпляре акта на морозе неудобно, а документ
 * без подписи исполнителя клиенту непонятен. Один раз загрузил — и она
 * встаёт во все его акты и заказ-наряды.
 */
export default async function MasterProfilePage() {
  const session = await requireMaster();
  const [profile, signature] = await Promise.all([
    getProfile(session.masterId),
    getMasterSignature(session.masterId),
  ]);

  return (
    <main className="safe-x mx-auto max-w-lg space-y-4 p-4">
      <header className="safe-top flex items-center gap-3 px-1 pt-2">
        <Link
          href="/my"
          aria-label="Назад к заявкам"
          className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-card)] bg-surface2"
        >
          <ArrowLeft size={18} aria-hidden />
        </Link>
        <h1 className="text-2xl font-semibold">{profile?.full_name ?? "Мастер"}</h1>
      </header>

      <SignatureForm value={signature} />
    </main>
  );
}
