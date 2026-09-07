import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/AdminNav";
import { LogoutButton } from "@/components/LogoutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // одна проверка на всю админку — дальше страницы уже доверяют роли
  await requireAdmin();

  return (
    <>
      <AdminNav action={<LogoutButton />} />
      <div className="safe-x safe-bottom mx-auto max-w-5xl p-4">{children}</div>
    </>
  );
}
