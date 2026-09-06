// Неразрывный пробел задаём кодом, а не символом: в исходнике его не видно,
// и его легко случайно заменить обычным пробелом при редактировании.
const NBSP = String.fromCharCode(0x00a0);

const MONTHS = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

/** Деньги в тенге. Неразрывные пробелы, чтобы сумма не переносилась по строкам. */
export function formatTenge(amount: number): string {
  const whole = Math.trunc(amount);
  const grouped = String(Math.abs(whole)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${whole < 0 ? "−" : ""}${grouped}${NBSP}₸`;
}

/** Казахстанский номер в читаемом виде. Непонятный ввод возвращаем как есть. */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 11) return raw;
  const d = digits.replace(/^8/, "7");
  return `+${d[0]} ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9, 11)}`;
}

/**
 * Человеческое время: свежее — относительно, старше суток — датой.
 * `now` передаётся параметром, чтобы функция была проверяемой.
 */
export function formatWhen(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60000);

  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;

  return `${then.getUTCDate()} ${MONTHS[then.getUTCMonth()]}`;
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
