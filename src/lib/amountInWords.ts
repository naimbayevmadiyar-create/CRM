/**
 * Сумма прописью для счёта на оплату.
 *
 * В счетах это обязательный реквизит: банки и бухгалтерии принимают документ
 * с суммой словами. Русский требует согласования рода и падежа — «одна тысяча»,
 * но «один миллион», — поэтому единицы и десятки собираются по правилам,
 * а не склеиваются из кусков.
 */

const ONES_MALE = [
  "", "один", "два", "три", "четыре", "пять",
  "шесть", "семь", "восемь", "девять",
];

const ONES_FEMALE = [
  "", "одна", "две", "три", "четыре", "пять",
  "шесть", "семь", "восемь", "девять",
];

const TEENS = [
  "десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать",
  "пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать",
];

const TENS = [
  "", "", "двадцать", "тридцать", "сорок", "пятьдесят",
  "шестьдесят", "семьдесят", "восемьдесят", "девяносто",
];

const HUNDREDS = [
  "", "сто", "двести", "триста", "четыреста", "пятьсот",
  "шестьсот", "семьсот", "восемьсот", "девятьсот",
];

/** Формы существительного: 1 рубль, 2 рубля, 5 рублей. */
type Forms = [one: string, few: string, many: string];

function plural(count: number, forms: Forms): string {
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return forms[2];
  const mod10 = count % 10;
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

/** Одна группа из трёх цифр словами. */
function tripletToWords(value: number, female: boolean): string[] {
  const words: string[] = [];
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;

  if (hundreds > 0) words.push(HUNDREDS[hundreds]);

  if (rest >= 10 && rest <= 19) {
    words.push(TEENS[rest - 10]);
  } else {
    const tens = Math.floor(rest / 10);
    const ones = rest % 10;
    if (tens > 0) words.push(TENS[tens]);
    if (ones > 0) words.push(female ? ONES_FEMALE[ones] : ONES_MALE[ones]);
  }

  return words;
}

const GROUPS: { forms: Forms; female: boolean }[] = [
  { forms: ["", "", ""], female: false }, // единицы — само существительное идёт отдельно
  { forms: ["тысяча", "тысячи", "тысяч"], female: true },
  { forms: ["миллион", "миллиона", "миллионов"], female: false },
  { forms: ["миллиард", "миллиарда", "миллиардов"], female: false },
];

export function amountInWords(amount: number): string {
  const whole = Math.trunc(Math.abs(amount));

  if (whole === 0) return "Ноль тенге 00 тиын";

  // разбиваем на группы по три цифры, начиная с младших
  const triplets: number[] = [];
  let rest = whole;
  while (rest > 0) {
    triplets.push(rest % 1000);
    rest = Math.floor(rest / 1000);
  }

  const words: string[] = [];
  for (let index = triplets.length - 1; index >= 0; index--) {
    const value = triplets[index];
    if (value === 0) continue;

    const group = GROUPS[index] ?? GROUPS[GROUPS.length - 1];
    words.push(...tripletToWords(value, group.female));

    if (index > 0) words.push(plural(value, group.forms));
  }

  const text = `${words.join(" ")} ${plural(whole, ["тенге", "тенге", "тенге"])} 00 тиын`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
