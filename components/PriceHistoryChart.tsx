import { PRICE_REASON_LABEL, formatDate, formatNumber } from "@/lib/format";

export type HistoryPoint = { at: string; priceToman: number; reason: string; rate: number; priceAed: number };

const REASON_COLOR: Record<string, string> = {
  INITIAL: "var(--cream)",
  RATE_CHANGE: "var(--cream-dim)",
  AED_CHANGE: "var(--neon)",
  DISCOUNT_CHANGE: "var(--gold)",
};

/**
 * نمودار پله‌ای قیمت تومانی؛ فقط از روی تغییرات واقعی ثبت‌شده رسم می‌شود.
 * رنگ هر نقطه نشان می‌دهد علت تغییر نرخ ارز بوده یا تغییر دستی قیمت/تخفیف.
 */
export function PriceHistoryChart({ points }: { points: HistoryPoint[] }) {
  const W = 640;
  const H = 220;
  const padX = 24;
  const padTop = 20;
  const padBottom = 28;

  const prices = points.map((p) => p.priceToman);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || max * 0.1 || 1;
  const lo = min - span * 0.15;
  const hi = max + span * 0.15;

  const x = (i: number) => padX + (points.length === 1 ? 0 : (i / (points.length - 1)) * (W - padX * 2));
  const y = (v: number) => padTop + (1 - (v - lo) / (hi - lo)) * (H - padTop - padBottom);

  // خط پله‌ای: قیمت تا تغییر بعدی ثابت می‌ماند
  let d = `M${x(0)},${y(points[0].priceToman)}`;
  for (let i = 1; i < points.length; i++) d += ` H${x(i)} V${y(points[i].priceToman)}`;

  const usedReasons = [...new Set(points.map((p) => p.reason))];

  return (
    <figure>
      <div dir="ltr" className="overflow-hidden rounded-2xl border border-line bg-raised p-3">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="نمودار تغییرات قیمت تومانی این عطر" className="h-auto w-full">
          <line x1={padX} x2={W - padX} y1={y(max)} y2={y(max)} stroke="var(--ink-line)" strokeDasharray="3 5" />
          <line x1={padX} x2={W - padX} y1={y(min)} y2={y(min)} stroke="var(--ink-line)" strokeDasharray="3 5" />
          <path d={d} fill="none" stroke="var(--cream-dim)" strokeWidth="2" strokeLinejoin="round" />
          {points.map((p, i) => (
            <circle key={p.at + i} cx={x(i)} cy={y(p.priceToman)} r="5" fill={REASON_COLOR[p.reason] ?? "var(--cream)"} stroke="var(--ink)" strokeWidth="2" />
          ))}
          <text x={padX} y={y(max) - 6} fill="var(--cream-dim)" fontSize="12" fontFamily="Vazirmatn, sans-serif">
            {formatNumber(max)}
          </text>
          {min !== max && (
            <text x={padX} y={y(min) + 16} fill="var(--cream-dim)" fontSize="12" fontFamily="Vazirmatn, sans-serif">
              {formatNumber(min)}
            </text>
          )}
          <text x={padX} y={H - 6} fill="var(--cream-dim)" fontSize="12" fontFamily="Vazirmatn, sans-serif">
            {formatDate(points[0].at)}
          </text>
          <text x={W - padX} y={H - 6} fill="var(--cream-dim)" fontSize="12" textAnchor="end" fontFamily="Vazirmatn, sans-serif">
            {formatDate(points[points.length - 1].at)}
          </text>
        </svg>
      </div>

      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-dim">
        {usedReasons.map((r) => (
          <span key={r} className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: REASON_COLOR[r] }} />
            {PRICE_REASON_LABEL[r] ?? r}
          </span>
        ))}
      </figcaption>

      {/* جدول برای صفحه‌خوان‌ها */}
      <table className="sr-only">
        <caption>تاریخچه‌ی قیمت</caption>
        <thead>
          <tr>
            <th>تاریخ</th>
            <th>قیمت به تومان</th>
            <th>علت تغییر</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p, i) => (
            <tr key={p.at + i}>
              <td>{formatDate(p.at)}</td>
              <td>{formatNumber(p.priceToman)}</td>
              <td>{PRICE_REASON_LABEL[p.reason] ?? p.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
