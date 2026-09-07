import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <p className="text-5xl font-semibold text-primary">404</p>
        <h1 className="mt-4 text-2xl font-semibold">Такой страницы нет</h1>
        <p className="mt-2 text-muted">
          Возможно, ссылка устарела или в адресе опечатка.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-14 w-full items-center justify-center
                     rounded-[var(--radius-card)] bg-primary text-lg font-medium text-primaryink"
        >
          На главную
        </Link>
      </div>
    </main>
  );
}
