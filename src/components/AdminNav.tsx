"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/format";

const LINKS = [
  { href: "/orders", label: "Заявки" },
  { href: "/leads", label: "Обращения" },
  { href: "/masters", label: "Мастера" },
  { href: "/analytics", label: "Аналитика" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-10 border-b border-border bg-surface/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-3 py-2.5">
        {LINKS.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "whitespace-nowrap rounded-[var(--radius-card)] px-3.5 py-2 font-medium transition-colors",
                active ? "bg-primary text-primaryink" : "text-muted hover:bg-surface2",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
