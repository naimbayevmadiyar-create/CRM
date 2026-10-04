/**
 * Выгрузка в CSV для Excel.
 *
 * Разделитель — точка с запятой, в начале файла BOM: русский Excel иначе
 * открывает файл одной колонкой и ломает кириллицу. Отдельной библиотеки
 * ради этого не нужно.
 */
export function toCsv(headers: string[], rows: (string | number | null)[][]): string {
  const cell = (value: string | number | null): string => {
    if (value === null || value === undefined) return "";
    const text = String(value);
    // кавычки удваиваем, всё подозрительное заворачиваем
    return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const lines = [headers.map(cell).join(";")];
  for (const row of rows) lines.push(row.map(cell).join(";"));

  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** Файл с периодом в имени: видно, что за что выгружено, не открывая. */
export function csvResponse(name: string, body: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}.csv`,
      "Cache-Control": "no-store",
    },
  });
}

/** Границы периода по Астане: оба дня включительно. */
export function rangeBounds(from: string, to: string) {
  return {
    fromIso: new Date(`${from}T00:00:00+05:00`).toISOString(),
    toIso: new Date(
      new Date(`${to}T00:00:00+05:00`).getTime() + 24 * 60 * 60 * 1000,
    ).toISOString(),
  };
}

export const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
