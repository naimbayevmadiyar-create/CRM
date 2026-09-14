/**
 * Место под подпись стороны.
 *
 * Раньше подпись и печать висели поверх строки абсолютно и наезжали на имя
 * и на текст выше. Здесь у них своё поле: имя на строке, ниже — полоса под
 * роспись, печать ложится на её правый край и уходит вниз, в пустое место.
 * Так выглядит живой документ: печать перекрывает подпись, а не текст.
 */
export function SignBlock({
  role,
  name,
  signature,
  stamp,
}: {
  role: string;
  /** Пусто — оставляем линию, впишут от руки. */
  name?: string | null;
  signature?: string | null;
  stamp?: string | null;
}) {
  return (
    <div className="doc-party">
      <div className="doc-party-row">
        <span className="doc-party-role">{role}:</span>
        <span className="doc-party-name">{name ?? ""}</span>
      </div>

      <div className="doc-sigline">
        {signature && (
          // картинка лежит строкой в базе, поэтому обычный img
          // eslint-disable-next-line @next/next/no-img-element
          <img src={signature} alt="" className="doc-sigimg" />
        )}
        {stamp && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={stamp} alt="" className="doc-sigstamp" />
        )}
      </div>
      <div className="doc-party-caption">подпись{stamp ? " · М. П." : ""}</div>
    </div>
  );
}
