export default function Loading() {
  return (
    <main className="mx-auto max-w-lg space-y-4 p-4" aria-busy="true" aria-label="Загрузка заявок">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-surface2" />
      {[0, 1].map((i) => (
        <div
          key={i}
          className="h-64 animate-pulse rounded-[var(--radius-card)] bg-surface2"
        />
      ))}
    </main>
  );
}
