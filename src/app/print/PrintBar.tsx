"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";

/**
 * Панель над документом. На бумагу не попадает — скрыта в @media print.
 * Печать штатная, браузерная: на компьютере уходит в принтер или PDF,
 * на телефоне — в «Поделиться».
 */
export function PrintBar({ backHref, title }: { backHref: string; title: string }) {
  return (
    <div className="print-bar">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 rounded-[var(--radius-card)]
                   px-2.5 py-2 text-sm text-muted hover:text-text"
      >
        <ArrowLeft size={16} aria-hidden />
        К заявке
      </Link>

      <span className="font-medium">{title}</span>

      <button
        type="button"
        onClick={() => window.print()}
        className="ml-auto inline-flex items-center gap-2 rounded-[var(--radius-card)]
                   bg-primary px-4 py-2.5 font-medium text-primaryink active:scale-[0.98]"
      >
        <Printer size={17} aria-hidden />
        Печать
      </button>
    </div>
  );
}
