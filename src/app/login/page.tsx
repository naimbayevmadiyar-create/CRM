import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primaryink">
            ЧС
          </div>
          <h1 className="text-2xl font-semibold">Честный сервис</h1>
          <p className="mt-1 text-muted">Введите пароль, чтобы войти</p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
