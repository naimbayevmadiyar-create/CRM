import { SignJWT, jwtVerify } from "jose";

/**
 * Сессия без учётных записей.
 *
 * После верного пароля сервер кладёт подписанную httpOnly-куку. В ней роль,
 * выбранный мастер и версия пароля мастеров. Прочитать или подделать её из
 * браузера нельзя: подпись проверяется секретом, которого на клиенте нет.
 */

export const SESSION_COOKIE = "cs_session";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // 90 дней: мастер не должен входить заново

export type SessionPayload = {
  role: "admin" | "master";
  /** Кого из мастеров выбрали на этом устройстве. У админа отсутствует. */
  masterId?: string;
  /** Версия пароля мастеров на момент входа. Не совпала — сессия недействительна. */
  pv: number;
};

function secret(): Uint8Array {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET не задан");
  return new TextEncoder().encode(value);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());

    const role = payload.role;
    if (role !== "admin" && role !== "master") return null;

    return {
      role,
      masterId: typeof payload.masterId === "string" ? payload.masterId : undefined,
      pv: typeof payload.pv === "number" ? payload.pv : 0,
    };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};
