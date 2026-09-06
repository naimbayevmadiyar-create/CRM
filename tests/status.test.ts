import { describe, expect, it } from "vitest";
import {
  canTransition,
  nextForMaster,
  masterButtonLabel,
  STATUS_LABEL,
  ACTIVE_STATUSES,
  STATUSES,
} from "@/lib/status";

describe("canTransition", () => {
  it("ведёт заявку по прямой цепочке", () => {
    expect(canTransition("new", "assigned")).toBe(true);
    expect(canTransition("assigned", "on_the_way")).toBe(true);
    expect(canTransition("on_the_way", "in_progress")).toBe(true);
    expect(canTransition("in_progress", "done")).toBe(true);
  });

  it("не даёт перепрыгнуть через этап", () => {
    expect(canTransition("new", "done")).toBe(false);
    expect(canTransition("assigned", "in_progress")).toBe(false);
    expect(canTransition("new", "in_progress")).toBe(false);
  });

  it("не даёт откатить назад", () => {
    expect(canTransition("done", "in_progress")).toBe(false);
    expect(canTransition("on_the_way", "assigned")).toBe(false);
    expect(canTransition("assigned", "new")).toBe(false);
  });

  it("разрешает отмену с любого рабочего этапа", () => {
    expect(canTransition("new", "canceled")).toBe(true);
    expect(canTransition("assigned", "canceled")).toBe(true);
    expect(canTransition("on_the_way", "canceled")).toBe(true);
    expect(canTransition("in_progress", "canceled")).toBe(true);
  });

  it("из завершённых состояний выхода нет", () => {
    expect(canTransition("done", "canceled")).toBe(false);
    expect(canTransition("canceled", "new")).toBe(false);
    expect(canTransition("canceled", "assigned")).toBe(false);
  });

  it("переход в самого себя запрещён", () => {
    expect(canTransition("assigned", "assigned")).toBe(false);
  });
});

describe("nextForMaster", () => {
  it("даёт мастеру ровно три шага", () => {
    expect(nextForMaster("assigned")).toBe("on_the_way");
    expect(nextForMaster("on_the_way")).toBe("in_progress");
    expect(nextForMaster("in_progress")).toBe("done");
  });

  it("на нераспределённой заявке кнопки нет — её сначала назначает диспетчер", () => {
    expect(nextForMaster("new")).toBeNull();
  });

  it("на завершённых заявках кнопки нет", () => {
    expect(nextForMaster("done")).toBeNull();
    expect(nextForMaster("canceled")).toBeNull();
  });
});

describe("masterButtonLabel", () => {
  it("подписывает кнопку понятным мастеру словом", () => {
    expect(masterButtonLabel("assigned")).toBe("Выехал");
    expect(masterButtonLabel("on_the_way")).toBe("На месте");
    expect(masterButtonLabel("in_progress")).toBe("Готово");
  });

  it("там, где переходить некуда, подписи нет", () => {
    expect(masterButtonLabel("new")).toBeNull();
    expect(masterButtonLabel("done")).toBeNull();
    expect(masterButtonLabel("canceled")).toBeNull();
  });
});

describe("справочники", () => {
  it("у каждого этапа есть русская подпись", () => {
    expect(STATUS_LABEL.on_the_way).toBe("В пути");
    expect(Object.keys(STATUS_LABEL)).toHaveLength(STATUSES.length);
    for (const s of STATUSES) {
      expect(STATUS_LABEL[s].length).toBeGreaterThan(0);
    }
  });

  it("активными считаются четыре этапа", () => {
    expect(ACTIVE_STATUSES).toEqual(["new", "assigned", "on_the_way", "in_progress"]);
  });
});
