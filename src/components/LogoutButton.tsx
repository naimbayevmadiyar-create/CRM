import { LogOut } from "lucide-react";
import { logout } from "@/app/logout/actions";
import { cn } from "@/lib/format";

export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logout}>
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
