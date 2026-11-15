import { useEffect, useMemo, useState } from 'react';
import { fetchDashboard, fetchOrderTrends, fetchCoursePaymentTrends } from '../api';
import { KpiCard, TrendHeader, shortMonth } from '../components/TrendCards';

const money = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const count = (n) => Number(n).toLocaleString('en-IN');
const compact = (n) => (n >= 100000 ? `₹${(n / 100000).toFixed(1).replace(/\.0$/, '')}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : `₹${Math.round(n)}`);
const when = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
const STATUS = { captured: 'Paid', completed: 'Paid', pending: 'Pending', failed: 'Failed', refunded: 'Refunded' };

// adds two month series day by day (they cover the same month, so the days line up)
const addSeries = (a, b) => Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? (i < a.length ? 0 : null) ?? 0) + (b[i] ?? 0));
const addMetric = (a, b) => ({
  current: a.current.map((v, i) => v + (b.current[i] ?? 0)),
  previous: addSeries(a.previous, b.previous),
  total: a.total + b.total,
  previousToDate: a.previousToDate + b.previousToDate,
  previousFull: (a.previousFull || 0) + (b.previousFull || 0),
});

/** 12 months of sales, designs and courses stacked */
function MonthBars({ months }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...months.map((m) => m.designs + m.courses), 1);
  const H = 250;
  const shown = hover != null ? months[hover] : null;
  return (
    <div className="bars">
      <div className="bars-readout" aria-live="polite">
        {shown ? <><strong>{shortMonth(shown.month)} {shown.month.slice(0, 4)}</strong> · {money(shown.designs + shown.courses)} <span className="muted">(designs {money(shown.designs)}, courses {money(shown.courses)})</span></> : <span className="muted">Hover a month to see its sales</span>}
      </div>
      <div className="bars-plot" style={{ height: H }}>
        {months.map((m, i) => {
          const total = m.designs + m.courses;
          return (
            <div key={m.month} className={`bar-col${hover === i ? ' hot' : ''}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0} aria-label={`${shortMonth(m.month)}: ${money(total)}`}>
              <span className="bar-total">{total ? compact(total) : ''}</span>
              <div className="bar-stack" style={{ height: `${(total / max) * 100}%` }}>
                {m.courses > 0 && <span className="seg courses" style={{ flex: m.courses }} />}
                {m.designs > 0 && <span className="seg designs" style={{ flex: m.designs }} />}
              </div>
              <span className="bar-label">{shortMonth(m.month).slice(0, 3)}</span>
            </div>
          );
        })}
      </div>
      <div className="legend"><span><i className="swatch designs" /> Designs</span><span><i className="swatch courses" /> Courses</span></div>
    </div>
  );
}

function Panel({ title, hint, action, children, className = '' }) {
  return (
    <section className={`panel dash-panel ${className}`}>
      <header className="panel-head">
        <h3>{title}</h3>
        {hint && <p>{hint}</p>}
        {action && <span className="panel-action">{action}</span>}
      </header>
      {children}
    </section>
  );
}

const Empty = ({ children }) => <p className="empty-line">{children}</p>;

export default function Dashboard({ onNavigate }) {
  const [month, setMonth] = useState(null);
  const [designTrend, setDesignTrend] = useState(null);
  const [courseTrend, setCourseTrend] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { fetchDashboard().then(setData).catch((e) => setError(e.message)); }, []);
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchOrderTrends(month), fetchCoursePaymentTrends(month)])
      .then(([d, c]) => { if (!cancelled) { setDesignTrend(d); setCourseTrend(c); } })
      .catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [month]);

  const trend = useMemo(() => (designTrend && courseTrend ? { ...designTrend, firstMonth: designTrend.firstMonth < courseTrend.firstMonth ? designTrend.firstMonth : courseTrend.firstMonth } : null), [designTrend, courseTrend]);
  const sales = useMemo(() => (designTrend && courseTrend ? addMetric(designTrend.metrics.revenue, courseTrend.metrics.revenue) : null), [designTrend, courseTrend]);
  const orders = useMemo(() => (designTrend && courseTrend ? addMetric(designTrend.metrics.orders, courseTrend.metrics.payments) : null), [designTrend, courseTrend]);

  if (error && !data) return <p className="modal-error">{error}</p>;
  const t = data?.totals;
  const a = data?.attention;
  const go = (page, params) => () => onNavigate(page, params);
  const attentionRows = a ? [
    { n: a.pendingDoubts, text: 'student doubts waiting for an answer', page: 'Doubts' },
    { n: a.certificateRequests, text: 'certificate requests to issue', page: 'Certificates' },
    { n: a.pendingOrders, text: 'design orders still pending', page: 'Payments' },
    { n: a.failedOrders, text: 'design payments failed', page: 'Payments' },
    { n: a.failedEnrollments, text: 'course payments failed', page: 'Course Payments' },
    { n: a.draftCourses, text: 'courses not published yet', page: 'Courses' },
  ].filter((r) => r.n > 0) : [];
  const ratingMax = data ? Math.max(...Object.values(data.ratings.distribution), 1) : 1;
  const designMax = data ? Math.max(...data.designs.map((d) => d.count), 1) : 1;

  return (
    <div className="dashboard">
      <TrendHeader trend={trend} setMonth={setMonth} />
      {trend && sales && designTrend && courseTrend ? (
        <>
          <section className="dash-group">
            <h3 className="dash-section">All sales <small>saree designs + courses together</small></h3>
            <div className="stats">
              <KpiCard label="Total sales" metric={sales} format={money} trend={trend} allTime={t ? `${money(t.designRevenue + t.courseRevenue)} all time` : null} />
              <KpiCard label="Orders & course purchases" metric={orders} format={count} trend={trend} allTime={t ? `${count(t.designOrders)} orders · ${count(t.courseSales)} purchases` : null} />
              <div className="kpi split-card">
                <span className="stat-label">Where this month’s sales came from</span>
                {(() => {
                  const d = designTrend.metrics.revenue.total; const c = courseTrend.metrics.revenue.total; const all = d + c;
                  return (
                    <>
                      <span className="split-bar" role="img" aria-label={`Designs ${money(d)}, courses ${money(c)}`}>
                        {all > 0 ? (<><i className="designs" style={{ flex: d }} /><i className="courses" style={{ flex: c }} /></>) : <i className="none" style={{ flex: 1 }} />}
                      </span>
                      <div className="split-rows">
                        <span><i className="swatch designs" /> Saree designs <strong>{money(d)}</strong>{all > 0 && <em>{Math.round((d / all) * 100)}%</em>}</span>
                        <span><i className="swatch courses" /> Courses <strong>{money(c)}</strong>{all > 0 && <em>{Math.round((c / all) * 100)}%</em>}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </section>

          <section className="dash-group designs">
            <h3 className="dash-section"><i className="swatch designs" /> Saree designs <small>sold from the design library</small></h3>
            <div className="stats">
              <KpiCard label="Design sales" metric={designTrend.metrics.revenue} format={money} trend={designTrend} allTime={t ? `${money(t.designRevenue)} all time` : null} />
              <KpiCard label="Design orders" metric={designTrend.metrics.orders} format={count} trend={designTrend} allTime={t ? `${count(t.designOrders)} all time` : null} />
              <KpiCard label="Designs sold" metric={designTrend.metrics.items} format={count} trend={designTrend} allTime={null} />
              <KpiCard label="Average design order" metric={designTrend.metrics.avg} format={money} trend={designTrend} allTime={t && t.designOrders ? `${money(t.designRevenue / t.designOrders)} all time` : null} />
            </div>
          </section>

          <section className="dash-group courses">
            <h3 className="dash-section"><i className="swatch courses" /> Courses <small>purchased by students</small></h3>
            <div className="stats">
              <KpiCard label="Course sales" metric={courseTrend.metrics.revenue} format={money} trend={courseTrend} allTime={t ? `${money(t.courseRevenue)} all time` : null} />
              <KpiCard label="Courses purchased" metric={courseTrend.metrics.payments} format={count} trend={courseTrend} allTime={t ? `${count(t.courseSales)} all time` : null} />
              <KpiCard label="Average course purchase" metric={courseTrend.metrics.avg} format={money} trend={courseTrend} allTime={t && t.courseSales ? `${money(t.courseRevenue / t.courseSales)} all time` : null} />
              <KpiCard label="Course add-ons" metric={courseTrend.metrics.addons} format={money} trend={courseTrend} allTime="certificates and doubt support" />
            </div>
          </section>
        </>
      ) : (
        <p className="muted">Loading the month…</p>
      )}

      {!data ? <p className="muted">Loading the dashboard…</p> : (
        <>
          <div className="dash-grid wide-left">
            <Panel title="Sales, last 12 months" hint="Designs and courses together"><MonthBars months={data.months} /></Panel>
            <Panel title="Needs attention" hint={attentionRows.length ? undefined : 'All clear'}>
              {attentionRows.length === 0 ? <Empty>Nothing is waiting for you.</Empty> : (
                <ul className="dash-list">
                  {attentionRows.map((r) => (
                    <li key={r.text}><button type="button" className="dash-row" onClick={go(r.page)}><strong className="dash-num">{r.n}</strong><span>{r.text}</span></button></li>
                  ))}
                </ul>
              )}
              {data.pendingDoubts.length > 0 && (
                <>
                  <h4 className="dash-sub">Oldest doubts</h4>
                  <ul className="dash-list">
                    {data.pendingDoubts.map((d) => (
                      <li key={d.id}><button type="button" className="dash-row" onClick={go('Doubts')}><span className="dash-main"><strong>{d.student}</strong><small>{d.course} · {d.question}</small></span><small>{when(d.created_at)}</small></button></li>
                    ))}
                  </ul>
                </>
              )}
            </Panel>
          </div>

          <div className="dash-grid three">
            <Panel title="Design catalogue" hint={`${count(data.designs.reduce((n, d) => n + d.count, 0))} designs`} action={<button type="button" className="link-btn" onClick={go('Designs')}>Open</button>}>
              <ul className="dash-bars">
                {data.designs.map((d) => (
                  <li key={d.key}><span>{d.label}</span><span className="hbar"><i style={{ width: `${(d.count / designMax) * 100}%` }} /></span><strong>{count(d.count)}</strong></li>
                ))}
              </ul>
            </Panel>
            <Panel title="Ratings" hint={data.ratings.total ? `${data.ratings.average} average from ${count(data.ratings.total)}` : undefined} action={<button type="button" className="link-btn" onClick={go('Ratings')}>Open</button>}>
              {data.ratings.total === 0 ? <Empty>No ratings yet.</Empty> : (
                <ul className="dash-bars">
                  {[5, 4, 3, 2, 1].map((s) => (
                    <li key={s}><span>{s} ★</span><span className="hbar"><i style={{ width: `${(data.ratings.distribution[s] / ratingMax) * 100}%` }} /></span><strong>{count(data.ratings.distribution[s])}</strong></li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="People">
              <ul className="dash-list">
                {[
                  ['Users', data.people.users, 'Users'],
                  ['Students', data.people.students, 'Students'],
                  ['Clients (designers)', data.people.clients, 'Client'],
                  ['Courses', `${data.people.publishedCourses} of ${data.people.courses} published`, 'Courses'],
                  ['Certificates issued', data.people.certificatesIssued, 'Certificates'],
                ].map(([label, value, page]) => (
                  <li key={label}><button type="button" className="dash-row" onClick={go(page)}><span className="dash-main"><strong>{label}</strong></span><span className="dash-figure"><strong>{typeof value === 'number' ? count(value) : value}</strong></span></button></li>
                ))}
              </ul>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
