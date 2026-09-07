import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Вход" };

export default function LoginPage() {
  return (
    <main className="safe-x flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Image
            src="/icon-192.png"
            alt=""
            width={56}
            height={56}
            priority
            className="mb-5 rounded-2xl"
          />
          <h1 className="text-2xl font-semibold">Честный сервис</h1>
          <p className="mt-1 text-muted">Введите пароль, чтобы войти</p>
        </div>

        <LoginForm />

        <p className="mt-8 text-center text-sm text-muted">
          Пароль выдаёт руководитель. Логин не нужен.
        </p>
      </div>
    </main>
  );
}
