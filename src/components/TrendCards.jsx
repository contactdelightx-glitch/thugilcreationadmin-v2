import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import Sparkline from './Sparkline';

// Month trend cards shared by the Payments and Course Payments pages.

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthName = (ym) => { const [y, m] = ym.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; };
export const shortMonth = (ym) => MONTHS[Number(ym.split('-')[1]) - 1];
export const stepMonth = (ym, by) => { const [y, m] = ym.split('-').map(Number); const t = y * 12 + (m - 1) + by; return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`; };

// up = filled, down = outlined, so it reads without colour
function Delta({ now, before, previousLabel }) {
  if (!before) {
    return (
      <span className="delta flat" title={now ? `Nothing in ${previousLabel} to compare with` : `No data in ${previousLabel}`}>
        {now ? 'New' : 'No data'}
      </span>
    );
  }
  const pct = ((now - before) / before) * 100;
  const rounded = Math.abs(pct) < 0.5 ? 0 : Math.round(Math.abs(pct));
  if (rounded === 0) return <span className="delta flat">No change</span>;
  return (
    <span className={`delta ${pct > 0 ? 'up' : 'down'}`}>
      {pct > 0 ? '▲' : '▼'} {rounded}% {pct > 0 ? 'up' : 'down'}
    </span>
  );
}

export function KpiCard({ label, metric, format, trend, allTime }) {
  const { current, previous, total, previousToDate } = metric;
  const compareWord = trend.isCurrentMonth ? `same days of ${shortMonth(trend.previousMonth)}` : shortMonth(trend.previousMonth);
  return (
    <div className="kpi">
      <div className="kpi-top">
        <span className="stat-label">{label}</span>
        <Delta now={total} before={previousToDate} previousLabel={shortMonth(trend.previousMonth)} />
      </div>
      <strong className="stat-value">{format(total)}</strong>
      <span className="stat-hint">
        vs {format(previousToDate)} {compareWord}
      </span>
      <Sparkline
        current={current}
        previous={previous}
        daysInMonth={trend.daysInMonth}
        format={format}
        monthLabel={shortMonth(trend.month)}
        previousLabel={shortMonth(trend.previousMonth)}
      />
      {allTime != null && <span className="kpi-foot">{allTime}</span>}
    </div>
  );
}


/** "November 2026 · so far (day 15)" with previous / next month buttons. setMonth(null) means the current month. */
export function TrendHeader({ trend, setMonth }) {
  return (
    <div className="kpi-head">
      <h3>{trend ? monthName(trend.month) : 'This month'}{trend && trend.isCurrentMonth ? <span className="muted"> · so far (day {trend.throughDay})</span> : null}</h3>
      {trend && (
        <div className="month-nav">
          <button className="icon-btn" aria-label="Previous month" disabled={trend.month <= trend.firstMonth} onClick={() => setMonth(stepMonth(trend.month, -1))}>
            <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={1.5} />
          </button>
          <button className="icon-btn" aria-label="Next month" disabled={trend.month >= trend.currentMonth} onClick={() => setMonth(trend.month === stepMonth(trend.currentMonth, -1) ? null : stepMonth(trend.month, 1))}>
            <HugeiconsIcon icon={ArrowRight01Icon} size={18} strokeWidth={1.5} />
          </button>
        </div>
      )}
    </div>
  );
}
