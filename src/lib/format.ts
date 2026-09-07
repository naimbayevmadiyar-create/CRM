// Неразрывный пробел задаём кодом, а не символом: в исходнике его не видно,
// и его легко случайно заменить обычным пробелом при редактировании.
const NBSP = String.fromCharCode(0x00a0);

/**
 * Сервис работает в Астане. Все даты и время показываем в её поясе, а не в UTC:
 * заявка, созданная в 23:00 по местному, иначе показывалась бы вчерашней.
 */
export const TIMEZONE = "Asia/Almaty";

const dayMonth = new Intl.DateTimeFormat("ru-RU", {
  timeZone: TIMEZONE,
  day: "numeric",
  month: "long",
});

const dayMonthTime = new Intl.DateTimeFormat("ru-RU", {
  timeZone: TIMEZONE,
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

const timeOnly = new Intl.DateTimeFormat("ru-RU", {
  timeZone: TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
});

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

/** Только цифры — для ссылок tel: и wa.me. */
export function phoneDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 11 ? digits.replace(/^8/, "7") : digits;
}

/**
 * Человеческое время: свежее — относительно, старше суток — датой.
 * `now` передаётся параметром, чтобы функция была проверяемой.
 */
export function formatWhen(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60000);

  if (minutes < 0) return dayMonthTime.format(then); // запланировано на будущее
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;

  return dayMonth.format(then);
}

/** Дата и время целиком — для запланированного выезда. */
export function formatDateTime(iso: string): string {
  return dayMonthTime.format(new Date(iso));
}

/** Только время — когда дата и так понятна из контекста. */
export function formatTime(iso: string): string {
  return timeOnly.format(new Date(iso));
}

/** Сегодняшняя ли дата по астанинскому времени. */
export function isToday(iso: string, now: Date = new Date()): boolean {
  return dayMonth.format(new Date(iso)) === dayMonth.format(now);
}

/**
 * Значение поля `datetime-local` в ISO с меткой пояса.
 *
 * Браузер отдаёт «2026-09-07T14:30» без часового пояса. На сервере Vercel
 * такая строка разобралась бы как UTC и время уехало бы на пять часов назад.
 * Казахстан живёт на UTC+5 круглый год, перевода часов нет — поэтому
 * смещение фиксированное.
 */
export function localInputToIso(value: string): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(`${value}:00+05:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

/** Обратное преобразование — чтобы подставить время в поле формы. */
export function isoToLocalInput(iso: string): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
  return parts.replace(" ", "T");
}

/** Минуты в человеческий вид: 95 → «1 ч 35 мин». */
export function formatDuration(minutes: number): string {
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded} мин`;
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return rest === 0 ? `${hours} ч` : `${hours} ч ${rest} мин`;
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
