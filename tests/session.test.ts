import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.SESSION_SECRET = "тестовый-секрет-достаточной-длины-для-подписи-hs256";
});

describe("сессия", () => {
  it("подписывает и читает полезную нагрузку мастера", async () => {
    const { signSession, verifySession } = await import("@/lib/session");
    const token = await signSession({ role: "master", masterId: "m-1", pv: 3 });
    expect(await verifySession(token)).toEqual({ role: "master", masterId: "m-1", pv: 3 });
  });

  it("подписывает и читает полезную нагрузку админа", async () => {
    const { signSession, verifySession } = await import("@/lib/session");
    const token = await signSession({ role: "admin", pv: 0 });
    const payload = await verifySession(token);
    expect(payload?.role).toBe("admin");
    expect(payload?.masterId).toBeUndefined();
  });

  it("отвергает подделанный токен", async () => {
    const { signSession, verifySession } = await import("@/lib/session");
    const token = await signSession({ role: "admin", pv: 1 });
    expect(await verifySession(token.slice(0, -3) + "abc")).toBeNull();
  });

  it("отвергает токен, подписанный чужим секретом", async () => {
    const { SignJWT } = await import("jose");
    const { verifySession } = await import("@/lib/session");
    const foreign = await new SignJWT({ role: "admin", pv: 0 })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode("совершенно-другой-секрет-подлиннее"));
    expect(await verifySession(foreign)).toBeNull();
  });

  it("отвергает неизвестную роль", async () => {
    const { SignJWT } = await import("jose");
    const { verifySession } = await import("@/lib/session");
    const token = await new SignJWT({ role: "director", pv: 0 })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(process.env.SESSION_SECRET!));
    expect(await verifySession(token)).toBeNull();
  });

  it("отвергает мусор и пустую строку", async () => {
    const { verifySession } = await import("@/lib/session");
    expect(await verifySession("не.токен.вовсе")).toBeNull();
    expect(await verifySession("")).toBeNull();
  });
});
