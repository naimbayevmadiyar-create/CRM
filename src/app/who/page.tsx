import { requireMasterSession } from "@/lib/auth";
import { listMasters } from "@/lib/db/profiles";
import { EmptyState } from "@/components/ui/EmptyState";
import { chooseMaster } from "./actions";

export default async function WhoPage() {
  // без пароля список имён сотрудников показывать нельзя
  await requireMasterSession();
  const masters = await listMasters();

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold">Кто ты?</h1>
      <p className="mb-6 mt-1 text-muted">
        Выбери своё имя. Телефон запомнит и больше не спросит.
      </p>

      {masters.length === 0 ? (
        <EmptyState
          title="Мастеров пока нет"
          hint="Попросите добавить вас в разделе «Мастера»."
        />
      ) : (
        <ul className="space-y-3">
          {masters.map((master) => (
            <li key={master.id}>
              <form action={chooseMaster}>
                <input type="hidden" name="masterId" value={master.id} />
                <button
                  type="submit"
                  className="h-16 w-full rounded-[var(--radius-card)] border border-border
                             bg-surface px-5 text-left text-lg font-medium shadow-[var(--shadow-card)]
                             transition-transform duration-100 active:scale-[0.99]"
                >
                  {master.full_name}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
