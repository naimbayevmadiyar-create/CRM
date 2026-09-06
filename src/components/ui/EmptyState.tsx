export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div
      className="rounded-[var(--radius-card)] border border-dashed border-border
                 bg-surface px-6 py-12 text-center"
    >
      <p className="text-lg font-medium">{title}</p>
      {hint && <p className="mx-auto mt-1.5 max-w-xs text-muted">{hint}</p>}
    </div>
  );
}
