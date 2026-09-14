import type { Metadata } from "next";
import Link from "next/link";
import { History } from "lucide-react";
import { requireMaster } from "@/lib/auth";
import { getProfile } from "@/lib/db/profiles";
import { listOrdersForMaster } from "@/lib/db/orders";
import { getDefaultSharePercent } from "@/lib/db/settings";
import { EmptyState } from "@/components/ui/EmptyState";
import { AutoRefresh } from "@/components/AutoRefresh";
import { LogoutButton } from "@/components/LogoutButton";
import { InstallHint } from "@/components/InstallHint";
import { OrderCard } from "./OrderCard";

export const metadata: Metadata = { title: "Мои заявки" };

export default async function MyOrdersPage() {
  const session = await requireMaster();
  const [orders, profile, fallbackPercent] = await Promise.all([
    listOrdersForMaster(session.masterId),
    getProfile(session.masterId),
    getDefaultSharePercent(),
  ]);

  const sharePercent = profile?.share_percent ?? fallbackPercent;

  return (
    <main className="safe-x mx-auto max-w-lg space-y-4 p-4">
      {/* новые заявки появляются сами — мастеру не надо тянуть страницу */}
      <AutoRefresh seconds={45} />

      <header className="safe-top flex items-baseline justify-between gap-3 px-1 pt-2">
        <h1 className="text-2xl font-semibold">Мои заявки</h1>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm text-muted">{profile?.full_name}</span>
          <LogoutButton />
        </div>
      </header>

      <InstallHint />

      <Link
        href="/my/closed"
        className="flex h-12 items-center gap-2 rounded-[var(--radius-card)]
                   border border-border bg-surface px-4 font-medium"
      >
        <History size={18} aria-hidden className="text-muted" />
        Закрытые заявки
      </Link>

      {orders.length === 0 ? (
        <EmptyState
          title="Заявок пока нет"
          hint="Появится новая — она возникнет здесь сама. Страницу обновлять не нужно."
        />
      ) : (
        <ul className="safe-bottom space-y-4">
          {orders.map((order) => (
            <li key={order.id}>
              <OrderCard order={order} sharePercent={sharePercent} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
