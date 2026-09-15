"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { reopenMyOrder } from "../actions";

/**
 * «Исправить отчёт» в архиве мастера.
 *
 * С подтверждением: заявка уйдёт из закрытых обратно в работу, и директор
 * снова увидит её как неоплаченную. Случайным нажатием такое делать нельзя.
 */
export function ReopenButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function reopen() {
    setError(null);
    startTransition(async () => {
      const result = await reopenMyOrder(orderId);
      if (result.error) {
        setError(result.error);
        setAsking(false);
        return;
      }
      router.push("/my");
    });
  }

  return (
    <div className="mt-3">
      {asking ? (
        <div className="rounded-[var(--radius-card)] bg-surface2 p-3 text-sm">
          <p>Заявка вернётся в работу, суммы и работы останутся — поправите и закроете заново.</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={reopen}
              disabled={pending}
              className="h-10 rounded-[var(--radius-card)] bg-primary px-4 font-medium text-primaryink disabled:opacity-60"
            >
              {pending ? "Открываем…" : "Да, исправить"}
            </button>
            <button
              onClick={() => setAsking(false)}
              className="h-10 rounded-[var(--radius-card)] px-4 text-muted"
            >
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAsking(true)}
          className="inline-flex h-10 items-center gap-1.5 rounded-[var(--radius-card)]
                     bg-surface2 px-3 text-sm font-medium"
        >
          <RotateCcw size={14} aria-hidden />
          Исправить отчёт
        </button>
      )}

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
