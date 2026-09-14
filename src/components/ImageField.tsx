"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";

/*
  Картинка едет в базу строкой и читается на каждой печати, поэтому её вес
  важнее её размера. Пробуем от крупного к мелкому: печать и логотип остаются
  разборчивыми и в 360 точек, а человек не должен получать отказ и идти
  пережимать файл руками.
*/
const SIDES = [700, 520, 400, 300];
const MAX_BYTES = 400_000;

/**
 * Картинка для документов: логотип, печать, подпись, QR.
 *
 * Файл не уходит в хранилище — он уменьшается прямо в браузере и едет
 * строкой вместе с формой. Для трёх картинок на всю систему заводить
 * бакет, ключи и правила доступа незачем: это лишний узел, который
 * однажды отвалится.
 */
export function ImageField({
  label,
  name,
  hint,
  value,
  height = "h-20",
}: {
  label: string;
  name: string;
  hint?: string;
  value: string | null;
  height?: string;
}) {
  const [image, setImage] = useState<string | null>(value);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);

    try {
      for (const side of SIDES) {
        const shrunk = await shrink(file, side);
        if (shrunk.length <= MAX_BYTES) {
          setImage(shrunk);
          return;
        }
      }
      setError("Картинка слишком тяжёлая — попробуйте файл поменьше");
    } catch {
      setError("Не удалось прочитать файл");
    }
  }

  return (
    <div className="sm:col-span-2">
      <p className="mb-1.5 text-sm text-muted">{label}</p>

      {/* значение уезжает на сервер отдельным полем: пустая строка — убрать */}
      <input type="hidden" name={name} value={image ?? ""} />

      <div className="flex flex-wrap items-center gap-3">
        {image && (
          // превью локальной картинки в data:URL — оптимизировать нечего
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className={`${height} w-auto rounded-[var(--radius-card)] bg-white p-1`}
          />
        )}

        <button
          type="button"
          onClick={() => input.current?.click()}
          className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-card)]
                     bg-surface2 px-4 text-sm font-medium"
        >
          <Upload size={16} aria-hidden />
          {image ? "Заменить" : "Загрузить"}
        </button>

        {image && (
          <button
            type="button"
            onClick={() => setImage(null)}
            className="inline-flex h-11 items-center gap-1.5 rounded-[var(--radius-card)]
                       px-3 text-sm text-muted"
          >
            <X size={15} aria-hidden />
            Убрать
          </button>
        )}

        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </div>

      {hint && <p className="mt-1.5 text-sm text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Уменьшает картинку до заданной стороны — в документ больше и не нужно. */
function shrink(file: File, maxSide: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const source = new Image();
      source.onerror = () => reject(new Error("decode"));
      source.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(source.width * scale);
        canvas.height = Math.round(source.height * scale);

        const context = canvas.getContext("2d");
        if (!context) return reject(new Error("canvas"));
        context.drawImage(source, 0, 0, canvas.width, canvas.height);

        // png держит прозрачность — печать и подпись без белого квадрата
        resolve(canvas.toDataURL("image/png"));
      };
      source.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
