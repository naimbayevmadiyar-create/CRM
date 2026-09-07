"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Экран ошибки вместо стандартного «A server error occurred».
 * Мастер должен понимать, что делать, а не читать английский текст
 * про сервер. Техническая подробность — только цифровой код, по нему
 * ошибку можно найти в логах Vercel.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Ошибка страницы:", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold">Не получилось загрузить</h1>
        <p className="mt-2 text-muted">
          Похоже, пропала связь с сервером. Попробуйте ещё раз — обычно
          помогает с первой попытки.
        </p>

        <Button size="lg" className="mt-6 w-full" onClick={reset}>
          <RotateCw size={18} aria-hidden />
          Попробовать снова
        </Button>

        <Link
          href="/"
          className="mt-3 inline-block text-sm text-muted underline underline-offset-4"
        >
          Вернуться на главную
        </Link>

        {error.digest && (
          <p className="mt-6 font-mono text-xs text-muted">код {error.digest}</p>
        )}
      </div>
    </main>
  );
}
