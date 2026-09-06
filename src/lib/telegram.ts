import "server-only";
import { SOURCE_LABEL, type Source } from "@/lib/source";

/**
 * Уведомления диспетчеру.
 *
 * Без токена в переменных окружения просто ничего не делает — CRM
 * при этом работает как обычно. Ошибки отправки глотаем: уведомление
 * не должно ломать приём заявки.
 */

const TIMEOUT_MS = 3000;

async function send(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_notification: false }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    // молча: связь с Telegram — не критичный путь
  }
}

export async function notifyLead(lead: {
  channel: "whatsapp" | "phone";
  source: Source;
  anchor: string | null;
}): Promise<void> {
  const what = lead.channel === "whatsapp" ? "Клик по WhatsApp" : "Клик по телефону";
  const where = lead.anchor ? `, экран ${lead.anchor}` : "";
  await send(`${what} · ${SOURCE_LABEL[lead.source]}${where}`);
}

export async function notifyOrder(order: {
  number: number;
  client_phone: string;
  appliance: string;
  source: Source;
}): Promise<void> {
  await send(
    `Новая заявка №${order.number}\n` +
      `${order.appliance}\n` +
      `${order.client_phone}\n` +
      `Источник: ${SOURCE_LABEL[order.source]}`,
  );
}
