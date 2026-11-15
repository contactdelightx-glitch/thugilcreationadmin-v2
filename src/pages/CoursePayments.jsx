import { Fragment, useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon, ArrowRight01Icon, ArrowDown01Icon, Copy01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { fetchCoursePayments, fetchCoursePaymentSummary, fetchCoursePaymentTrends } from '../api';
import useInfiniteList from '../useInfiniteList';
import ScrollFooter from '../components/ScrollFooter';
import { KpiCard, TrendHeader } from '../components/TrendCards';
import { copyText } from '../clipboard';

const LIMIT = 30;
const FILTERS = ['all', 'completed', 'pending', 'failed', 'refunded'];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const money = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const count = (n) => Number(n).toLocaleString('en-IN');
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
// completed = money received (filled dot); anything else is shown with a hollow dot
const STATUS_STYLE = { completed: 'active', pending: 'suspended', failed: 'removed', refunded: 'removed' };
const dash = <span className="muted">—</span>;

// the expanded part: what the payment was made of, and its references (tables, not cards)
function PaymentDetails({ p }) {
  const rows = [
    ['Course price', money(p.base_price)],
    Number(p.discount_amount) > 0 && ['Discount', `− ${money(p.discount_amount)}`],
    Number(p.certificate_fee) > 0 && ['Certificate', `+ ${money(p.certificate_fee)}`],
    Number(p.doubt_support_fee) > 0 && ['Doubt support', `+ ${money(p.doubt_support_fee)}`],
  ].filter(Boolean);
  return (
    <div className="sub-tables">
      <h4 className="sub-title">Price breakdown</h4>
      <table className="sub-table narrow-table">
        <thead>
          <tr><th>Item</th><th className="num">Amount</th></tr>
        </thead>
        <tbody>
          {rows.map(([item, amount]) => (
            <tr key={item}><td data-label="Item">{item}</td><td data-label="Amount" className="num">{amount}</td></tr>
          ))}
          <tr className="total-row"><td data-label="Item"><strong>Total paid</strong></td><td data-label="Amount" className="num"><strong>{money(p.amount_paid)}</strong></td></tr>
        </tbody>
      </table>

      <h4 className="sub-title">Payment reference</h4>
      <table className="sub-table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Method</th>
            <th>Transaction ID</th>
            <th>Razorpay order ID</th>
            <th>Razorpay payment ID</th>
            <th>Currency</th>
            <th>Paid on</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td data-label="Status"><span className={`status ${STATUS_STYLE[p.payment_status] || 'removed'}`}>{cap(p.payment_status)}</span></td>
            <td data-label="Method">{p.payment_method ? cap(p.payment_method) : dash}</td>
            <td data-label="Transaction ID"><span className="mono">{p.transaction_id || '—'}</span></td>
            <td data-label="Razorpay order ID"><span className="mono">{p.razorpay_order_id || '—'}</span></td>
            <td data-label="Razorpay payment ID"><span className="mono">{p.razorpay_payment_id || '—'}</span></td>
            <td data-label="Currency">{p.currency}</td>
            <td data-label="Paid on">{fmtDate(p.enrolled_at)} {fmtTime(p.enrolled_at)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function CoursePayments() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [summary, setSummary] = useState(null);
  const [month, setMonth] = useState(null); // null = current month
  const [trend, setTrend] = useState(null);
  const [trendError, setTrendError] = useState('');
  const [open, setOpen] = useState({}); // payment id -> true
  const [copied, setCopied] = useState('');

  useEffect(() => { fetchCoursePaymentSummary().then(setSummary).catch(() => {}); }, []);

  useEffect(() => {
    let cancelled = false;
    setTrendError('');
    fetchCoursePaymentTrends(month)
      .then((t) => !cancelled && setTrend(t))
      .catch((e) => !cancelled && setTrendError(e.message));
    return () => { cancelled = true; };
  }, [month]);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const list = useInfiniteList(
    ({ offset, limit, signal }) => fetchCoursePayments({ search: query, status, offset, limit, signal }),
    [query, status],
    LIMIT,
    (p) => p.id
  );
  const { items: payments, loading, error } = list;

  const toggle = (id) => setOpen((o) => { if (o[id]) { const { [id]: _x, ...rest } = o; return rest; } return { ...o, [id]: true }; });

  async function copy(e, id, text) {
    e.stopPropagation();
    if (await copyText(text)) {
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? '' : c)), 1500);
    }
  }

  return (
    <div className="course-payments">
      <TrendHeader trend={trend} setMonth={setMonth} />
      {trendError && <div className="notice">Could not load the trends: {trendError}</div>}

      <div className="stats">
        {trend ? (
          <>
            <KpiCard label="Course revenue" metric={trend.metrics.revenue} format={money} trend={trend} allTime={summary ? `${money(summary.revenue)} all time` : null} />
            <KpiCard label="Payments" metric={trend.metrics.payments} format={count} trend={trend} allTime={summary ? `${count(summary.payments)} all time` : null} />
            <KpiCard label="Average payment" metric={trend.metrics.avg} format={money} trend={trend} allTime={summary ? `${money(summary.average)} all time` : null} />
            <KpiCard label="Add-on revenue" metric={trend.metrics.addons} format={money} trend={trend} allTime={summary ? `${summary.certificates} certificates · ${summary.doubtSupport} doubt support` : null} />
          </>
        ) : (
          !trendError && Array.from({ length: 4 }, (_, i) => <div key={i} className="kpi kpi-skeleton" />)
        )}
      </div>

      <div className="toolbar">
        <div className="search wide">
          <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.5} />
          <input placeholder="Search student, course or payment ID" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="segmented">
          {FILTERS.map((s) => (
            <button key={s} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>{cap(s)}</button>
          ))}
        </div>
      </div>

      {error && <div className="notice">Could not load course payments: {error}</div>}

      <div className={`table-wrap${loading && payments.length ? ' loading' : ''}`}>
        <table className="orders-table course-pay-table">
          <thead>
            <tr>
              <th className="col-toggle" />
              <th>Payment</th>
              <th>Date</th>
              <th>Student</th>
              <th>Course</th>
              <th className="num">Amount</th>
              <th>Status</th>
              <th>Payment ID</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => {
              const isOpen = Boolean(open[p.id]);
              return (
                <Fragment key={p.id}>
                  <tr className={`clickable-row${isOpen ? ' is-open' : ''}`} onClick={() => toggle(p.id)}>
                    <td className="col-toggle" data-label="">
                      <HugeiconsIcon icon={isOpen ? ArrowDown01Icon : ArrowRight01Icon} size={16} strokeWidth={1.5} />
                    </td>
                    <td data-label="Payment" className="cell-strong">#{p.id}</td>
                    <td data-label="Date">{fmtDate(p.enrolled_at)} <span className="muted">{fmtTime(p.enrolled_at)}</span></td>
                    <td data-label="Student">
                      <div className="customer-cell">
                        <span className="cell-strong">{p.student_name || p.student_email}</span>
                        {p.student_name && <span className="muted">{p.student_email}</span>}
                      </div>
                    </td>
                    <td data-label="Course"><span className="course-name">{p.course_title}</span></td>
                    <td data-label="Amount" className="num cell-strong">
                      <span className="paid">
                        {money(p.amount_paid)}
                        <span className="addons">
                          {p.certificate_included && <i>Certificate</i>}
                          {p.doubt_support_included && <i>Doubt support</i>}
                        </span>
                      </span>
                    </td>
                    <td data-label="Status"><span className={`status ${STATUS_STYLE[p.payment_status] || 'removed'}`}>{cap(p.payment_status)}</span></td>
                    <td data-label="Payment ID">
                      <span className="pay-id">
                        <span className="mono">{p.razorpay_payment_id}</span>
                        <button className="act" title="Copy payment ID" aria-label={`Copy payment ID of payment ${p.id}`} onClick={(e) => copy(e, p.id, p.razorpay_payment_id)}>
                          <HugeiconsIcon icon={copied === p.id ? Tick02Icon : Copy01Icon} size={16} strokeWidth={1.5} />
                        </button>
                      </span>
                    </td>
                  </tr>

                  {isOpen && (
                    <tr className="order-items-row">
                      <td colSpan={8}><PaymentDetails p={p} /></td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {loading && payments.length === 0 && <tr className="empty"><td colSpan={8}>Loading course payments…</td></tr>}
            {!loading && !error && payments.length === 0 && (
              <tr className="empty"><td colSpan={8}>{query || status !== 'all' ? 'No payments match.' : 'No course payments yet.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ScrollFooter list={list} noun="payments" />
    </div>
  );
}
