import { useState } from 'react';

const W = 300;
const H = 84;
const PAD_TOP = 6;
const PAD_BOTTOM = 4;

/**
 * Month-so-far line (solid black) over last month's line (grey), both cumulative by day.
 * Hovering shows the values for that day.
 */
export default function Sparkline({ current, previous, daysInMonth, format, monthLabel, previousLabel }) {
  const [hover, setHover] = useState(null); // day number, 1-based
  const days = Math.max(daysInMonth, previous.length, 2);

  const all = [...current, ...previous].filter((v) => v != null);
  const max = Math.max(...all, 1);
  const x = (day) => ((day - 1) / (days - 1)) * W;
  const y = (v) => PAD_TOP + (1 - v / max) * (H - PAD_TOP - PAD_BOTTOM);

  // a line may have gaps (null = nothing yet), so build it in segments
  const path = (series) => {
    let d = '';
    let pen = false;
    series.forEach((v, i) => {
      if (v == null) { pen = false; return; }
      d += `${pen ? 'L' : 'M'}${x(i + 1).toFixed(1)} ${y(v).toFixed(1)} `;
      pen = true;
    });
    return d.trim();
  };

  const firstCur = current.findIndex((v) => v != null);
  const area = firstCur >= 0 && current.every((v, i) => i < firstCur || v != null)
    ? `${path(current)} L${x(current.length).toFixed(1)} ${H} L${x(firstCur + 1).toFixed(1)} ${H} Z`
    : '';

  function onMove(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const frac = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
    setHover(Math.round(frac * (days - 1)) + 1);
  }

  const curAt = hover ? current[hover - 1] : null;
  const prevAt = hover ? previous[hover - 1] : null;
  const dot = (series, day) => (series[day - 1] != null ? { left: `${(x(day) / W) * 100}%`, top: `${(y(series[day - 1]) / H) * 100}%` } : null);

  return (
    <div className="spark">
      <div className="spark-plot" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          {area && <path d={area} className="spark-area" />}
          <path d={path(previous)} className="spark-prev" vectorEffect="non-scaling-stroke" />
          <path d={path(current)} className="spark-cur" vectorEffect="non-scaling-stroke" />
          {hover && <line x1={x(hover)} x2={x(hover)} y1="0" y2={H} className="spark-guide" vectorEffect="non-scaling-stroke" />}
        </svg>
        {hover && dot(previous, hover) && <span className="spark-dot prev" style={dot(previous, hover)} />}
        {hover && dot(current, hover) && <span className="spark-dot cur" style={dot(current, hover)} />}
      </div>
      <div className="spark-legend">
        {hover ? (
          <>
            <span>Day {hover}</span>
            <span><i className="key cur" /> {curAt != null ? format(curAt) : '—'}</span>
            <span><i className="key prev" /> {prevAt != null ? format(prevAt) : '—'}</span>
          </>
        ) : (
          <>
            <span><i className="key cur" /> {monthLabel}</span>
            <span><i className="key prev" /> {previousLabel}</span>
          </>
        )}
      </div>
    </div>
  );
}
