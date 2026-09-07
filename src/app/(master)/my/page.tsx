import type { Metadata } from "next";
import Link from "next/link";
import { requireMaster } from "@/lib/auth";
import { getProfile } from "@/lib/db/profiles";
import { listOrdersForMaster } from "@/lib/db/orders";
import { EmptyState } from "@/components/ui/EmptyState";
import { AutoRefresh } from "@/components/AutoRefresh";
import { LogoutButton } from "@/components/LogoutButton";
import { OrderCard } from "./OrderCard";

export const metadata: Metadata = { title: "Мои заявки" };

export default async function MyOrdersPage() {
  const session = await requireMaster();
  const [orders, profile] = await Promise.all([
    listOrdersForMaster(session.masterId),
    getProfile(session.masterId),
  ]);

  return (
    <main className="safe-x mx-auto max-w-lg space-y-4 p-4">
      {/* новые заявки появляются сами — мастеру не надо тянуть страницу */}
      <AutoRefresh seconds={45} />

      <header className="safe-top flex items-baseline justify-between gap-3 px-1 pt-2">
        <h1 className="text-2xl font-semibold">Мои заявки</h1>
        <div className="flex shrink-0 items-center gap-1">
          <Link href="/who" className="text-sm text-muted underline underline-offset-4">
            {profile?.full_name ?? "сменить имя"}
          </Link>
          <LogoutButton />
        </div>
      </header>

      {orders.length === 0 ? (
        <EmptyState
          title="Заявок пока нет"
          hint="Появится новая — она возникнет здесь сама. Страницу обновлять не нужно."
        />
      ) : (
        <ul className="safe-bottom space-y-4">
          {orders.map((order) => (
            <li key={order.id}>
              <OrderCard order={order} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
