import { requireMaster } from "@/lib/auth";
import { getProfile } from "@/lib/db/profiles";
import { listOrdersForMaster } from "@/lib/db/orders";
import { EmptyState } from "@/components/ui/EmptyState";
import { OrderCard } from "./OrderCard";

export default async function MyOrdersPage() {
  const session = await requireMaster();
  const [orders, profile] = await Promise.all([
    listOrdersForMaster(session.masterId),
    getProfile(session.masterId),
  ]);

  return (
    <main className="mx-auto max-w-lg space-y-4 p-4 pb-20">
      <header className="flex items-baseline justify-between gap-3 px-1 pt-2">
        <h1 className="text-2xl font-semibold">Мои заявки</h1>
        <a href="/who" className="shrink-0 text-sm text-muted underline underline-offset-4">
          {profile?.full_name ?? "сменить имя"}
        </a>
      </header>

      {orders.length === 0 ? (
        <EmptyState
          title="Заявок пока нет"
          hint="Появится новая — она будет здесь. Страницу обновлять не нужно."
        />
      ) : (
        orders.map((order) => <OrderCard key={order.id} order={order} />)
      )}
    </main>
  );
}
