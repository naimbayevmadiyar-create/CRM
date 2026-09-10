"use client";

import { LogOut } from "lucide-react";
import { logout } from "@/app/logout/actions";
import { cn } from "@/lib/format";

/** Стираем кеш приложения при выходе: телефон может быть общим. */
async function clearAppCache() {
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } catch {
    // не получилось — данных там всё равно нет, только статика
  }
}

export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logout} onSubmit={() => { void clearAppCache(); }}>
      <button
        type="submit"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-[var(--radius-card)] px-3 py-2",
          "text-sm text-muted transition-colors hover:text-text",
          className,
        )}
      >
        <LogOut size={16} aria-hidden />
        Выйти
      </button>
    </form>
  );
}
