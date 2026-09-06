import { requireAdmin } from "@/lib/auth";
import { AdminNav } from "@/components/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // одна проверка на всю админку — дальше страницы уже доверяют роли
  await requireAdmin();

  return (
    <>
      <AdminNav />
      <div className="mx-auto max-w-5xl p-4 pb-16">{children}</div>
    </>
  );
}
