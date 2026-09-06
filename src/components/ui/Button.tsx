"use client";

import { cn } from "@/lib/format";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
  size?: "md" | "lg";
};

/**
 * Размер lg — 56 пикселей: под палец мастера, который жмёт на морозе
 * и иногда в перчатке. Меньше не делаем.
 */
export function Button({ variant = "primary", size = "md", className, ...rest }: Props) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-card)]",
        "font-medium transition-transform duration-100",
        "active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100",
        size === "lg" ? "h-14 px-6 text-lg" : "h-11 px-4 text-base",
        variant === "primary" && "bg-primary text-primaryink",
        variant === "ghost" && "bg-surface2 text-text",
        variant === "danger" && "bg-danger text-white",
        className,
      )}
    />
  );
}
