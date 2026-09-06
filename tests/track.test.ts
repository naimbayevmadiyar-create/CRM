import { describe, expect, it } from "vitest";
import { parseTrackBody } from "@/app/api/track/parse";

describe("parseTrackBody", () => {
  it("принимает корректное обращение", () => {
    const result = parseTrackBody(
      JSON.stringify({ channel: "whatsapp", anchor: "#stiralnye" }),
    );
    expect(result).toMatchObject({ channel: "whatsapp", page_anchor: "#stiralnye" });
  });

  it("принимает клик по телефону", () => {
    expect(parseTrackBody(JSON.stringify({ channel: "phone" }))?.channel).toBe("phone");
  });

  it("отвергает неизвестный канал", () => {
    expect(parseTrackBody(JSON.stringify({ channel: "telegram" }))).toBeNull();
    expect(parseTrackBody(JSON.stringify({}))).toBeNull();
  });

  it("отвергает не-JSON и пустое тело", () => {
    expect(parseTrackBody("не json")).toBeNull();
    expect(parseTrackBody("")).toBeNull();
  });

  it("отвергает JSON, который не объект", () => {
    expect(parseTrackBody("[1,2,3]")).toBeNull();
    expect(parseTrackBody('"строка"')).toBeNull();
    expect(parseTrackBody("null")).toBeNull();
  });

  it("обрезает слишком длинные строки", () => {
    const result = parseTrackBody(
      JSON.stringify({ channel: "phone", anchor: "x".repeat(500) }),
    );
    expect(result?.page_anchor).toHaveLength(200);
  });

  it("реферер режет по своей, более щедрой границе", () => {
    const result = parseTrackBody(
      JSON.stringify({ channel: "phone", referrer: "https://e.kz/" + "a".repeat(900) }),
    );
    expect(result?.referrer).toHaveLength(500);
  });

  it("игнорирует лишние поля", () => {
    const result = parseTrackBody(
      JSON.stringify({ channel: "phone", evil: "<script>", order_id: "подмена" }),
    );
    expect(result).not.toHaveProperty("evil");
    expect(result).not.toHaveProperty("order_id");
  });

  it("пустые строки превращает в null, а не в пустоту", () => {
    const result = parseTrackBody(
      JSON.stringify({ channel: "phone", anchor: "   ", gclid: "" }),
    );
    expect(result?.page_anchor).toBeNull();
    expect(result?.gclid).toBeNull();
  });

  it("нестроковые значения полей отбрасывает", () => {
    const result = parseTrackBody(
      JSON.stringify({ channel: "phone", gclid: 42, utm_source: { a: 1 } }),
    );
    expect(result?.gclid).toBeNull();
    expect(result?.utm_source).toBeNull();
  });
});
