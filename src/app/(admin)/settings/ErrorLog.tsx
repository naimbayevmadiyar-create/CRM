import { formatDateTime } from "@/lib/format";
import type { AppError } from "@/lib/db/errors";

const WHERE: Record<string, string> = {
  render: "страница",
  action: "кнопка",
  route: "запрос",
  proxy: "вход",
};

/**
 * Журнал ошибок для директора.
 *
 * Человек видит на экране «Не получилось загрузить» и код. Здесь по этому
 * коду находится строка: где упало и что именно. Её и присылать
 * разработчику — вместо «иногда не работает».
 */
export function ErrorLog({ errors }: { errors: AppError[] }) {
  return (
    <section className="mt-8 rounded-[var(--radius-card)] border border-border bg-surface p-5">
      <h2 className="text-lg font-semibold">Журнал ошибок</h2>
      <p className="mt-1 text-sm text-muted">
        Последние сбои за 30 дней. Код в первой колонке — тот, что был на экране
        у человека. Если ошибка повторяется, пришлите разработчику её строку.
      </p>

      {errors.length === 0 ? (
        <p className="mt-4 text-sm text-success">Ошибок нет.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="py-2 pr-3 font-medium">Код</th>
                <th className="py-2 pr-3 font-medium">Когда</th>
                <th className="py-2 pr-3 font-medium">Где</th>
                <th className="py-2 font-medium">Что</th>
              </tr>
            </thead>
            <tbody>
              {errors.map((row) => (
                <tr key={row.id} className="border-b border-border align-top last:border-0">
                  <td className="py-2 pr-3 font-mono text-xs">{row.digest ?? "—"}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-muted">
                    {formatDateTime(row.created_at)}
                  </td>
                  <td className="py-2 pr-3">
                    {row.path ?? "—"}
                    <span className="block text-xs text-muted">
                      {row.source === "client" ? "в браузере" : "на сервере"}
                      {row.route_type ? ` · ${WHERE[row.route_type] ?? row.route_type}` : ""}
                      {row.role ? ` · ${row.role === "admin" ? "админ" : "мастер"}` : ""}
                    </span>
                  </td>
                  <td className="break-all py-2 font-mono text-xs">{row.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
