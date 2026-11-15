import { Fragment, useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  ArrowRight01Icon,
  ArrowDown01Icon,
  Copy01Icon,
  Tick02Icon,
  ImageNotFound01Icon,
} from '@hugeicons/core-free-icons';
import { fetchOrders, fetchOrderSummary, fetchOrderItems, fetchOrderTrends } from '../api';
import { KpiCard, TrendHeader } from '../components/TrendCards';
import useInfiniteList from '../useInfiniteList';
import ScrollFooter from '../components/ScrollFooter';
import { copyText } from '../clipboard';

const LIMIT = 30;
const FILTERS = ['all', 'captured', 'pending', 'failed', 'refunded'];
const CATEGORY = { butta: 'Butta', brocade: 'Brocade', border: 'Border', pallu: 'Pallu', pattern: 'Pattern', full_set: 'Full Set', free_image: 'Free Image' };
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const money = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
// captured = money received; anything else is shown as a hollow dot
const STATUS_STYLE = { captured: 'active', pending: 'suspended', failed: 'removed', refunded: 'removed' };

function Thumb({ src, alt }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <div className="thumb-fallback"><HugeiconsIcon icon={ImageNotFound01Icon} size={18} strokeWidth={1.5} /></div>;
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}

export default function Payments() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [summary, setSummary] = useState(null);
  const [month, setMonth] = useState(null); // null = current month
  const [trend, setTrend] = useState(null);
  const [trendError, setTrendError] = useState('');
  const [open, setOpen] = useState({}); // order id -> { loading, items, error }
  const [copied, setCopied] = useState('');

  useEffect(() => {
    fetchOrderSummary().then(setSummary).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setTrendError('');
    fetchOrderTrends(month)
      .then((t) => !cancelled && setTrend(t))
      .catch((e) => !cancelled && setTrendError(e.message));
    return () => { cancelled = true; };
  }, [month]);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const list = useInfiniteList(
    ({ offset, limit, signal }) => fetchOrders({ search: query, status, offset, limit, signal }),
    [query, status],
    LIMIT,
    (o) => o.id
  );
  const { items: orders, loading, error } = list;

  async function toggle(o) {
    const isOpen = !!open[o.id];
    if (isOpen) return setOpen((s) => { const { [o.id]: _gone, ...rest } = s; return rest; });
    setOpen((s) => ({ ...s, [o.id]: { loading: true, items: null, error: '' } }));
    try {
      const items = await fetchOrderItems(o.id);
      setOpen((s) => (s[o.id] ? { ...s, [o.id]: { loading: false, items, error: '' } } : s));
    } catch (e) {
      setOpen((s) => (s[o.id] ? { ...s, [o.id]: { loading: false, items: null, error: e.message } } : s));
    }
  }

  async function copy(e, id, text) {
    e.stopPropagation();
    if (await copyText(text)) {
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? '' : c)), 1500);
    }
  }

  return (
    <div className="payments">
      <TrendHeader trend={trend} setMonth={setMonth} />

      {trendError && <div className="notice">Could not load the trends: {trendError}</div>}

      <div className="stats">
        {trend ? (
          <>
            <KpiCard label="Revenue" metric={trend.metrics.revenue} format={money} trend={trend} allTime={summary ? `${money(summary.revenue)} all time` : null} />
            <KpiCard label="Orders" metric={trend.metrics.orders} format={(n) => Number(n).toLocaleString('en-IN')} trend={trend} allTime={summary ? `${summary.orders.toLocaleString('en-IN')} all time` : null} />
            <KpiCard label="Designs sold" metric={trend.metrics.items} format={(n) => Number(n).toLocaleString('en-IN')} trend={trend} allTime={summary ? `${summary.itemsSold.toLocaleString('en-IN')} all time` : null} />
            <KpiCard label="Average order" metric={trend.metrics.avg} format={money} trend={trend} allTime={summary && summary.captured ? `${money(summary.revenue / summary.captured)} all time` : null} />
          </>
        ) : (
          !trendError && Array.from({ length: 4 }, (_, i) => <div key={i} className="kpi kpi-skeleton" />)
        )}
      </div>

      <div className="toolbar">
        <div className="search wide">
          <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.5} />
          <input placeholder="Search order, mobile, customer…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="segmented">
          {FILTERS.map((s) => (
            <button key={s} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>{cap(s)}</button>
          ))}
        </div>
      </div>

      {error && <div className="notice">Could not load orders: {error}</div>}

      <div className={`table-wrap${loading && orders.length ? ' loading' : ''}`}>
        <table className="orders-table">
          <thead>
            <tr>
              <th className="col-toggle" />
              <th>Order</th>
              <th>Date</th>
              <th>Customer</th>
              <th className="num">Designs</th>
              <th className="num">Total</th>
              <th>Payment</th>
              <th>Payment ID</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const details = open[o.id];
              return (
                <Fragment key={o.id}>
                  <tr className={`clickable-row${details ? ' is-open' : ''}`} onClick={() => toggle(o)}>
                    <td className="col-toggle" data-label="">
                      <HugeiconsIcon icon={details ? ArrowDown01Icon : ArrowRight01Icon} size={16} strokeWidth={1.5} />
                    </td>
                    <td data-label="Order" className="cell-strong">#{o.id}</td>
                    <td data-label="Date">{fmtDate(o.created_at)} <span className="muted">{fmtTime(o.created_at)}</span></td>
                    <td data-label="Customer">
                      <div className="customer-cell">
                        <span>{o.customer_name || o.customer_email || o.mobile_number}</span>
                        {(o.customer_name || o.customer_email) && <span className="muted">{o.mobile_number}</span>}
                      </div>
                    </td>
                    <td data-label="Designs" className="num">{o.item_count}</td>
                    <td data-label="Total" className="num cell-strong">
                      <span>
                        {money(o.total)}
                        {Number(o.platform_fee) > 0 && <span className="muted fee"> incl. {money(o.platform_fee)} fee</span>}
                      </span>
                    </td>
                    <td data-label="Payment"><span className={`status ${STATUS_STYLE[o.payment_status] || 'removed'}`}>{cap(o.payment_status)}</span></td>
                    <td data-label="Payment ID">
                      <span className="pay-id">
                        <span className="mono">{o.razorpay_payment_id}</span>
                        <button className="act" title="Copy payment ID" aria-label={`Copy payment ID of order ${o.id}`} onClick={(e) => copy(e, o.id, o.razorpay_payment_id)}>
                          <HugeiconsIcon icon={copied === o.id ? Tick02Icon : Copy01Icon} size={16} strokeWidth={1.5} />
                        </button>
                      </span>
                    </td>
                  </tr>

                  {details && (
                    <tr className="order-items-row">
                      <td colSpan={8}>
                        {details.loading && <span className="muted">Loading designs…</span>}
                        {details.error && <span>Could not load the designs: {details.error}</span>}
                        {details.items && (
                          <div className="order-items">
                            {details.items.map((it) => (
                              <div key={it.id} className="order-item">
                                <div className="order-thumb"><Thumb src={it.image_url} alt={it.design_name} /></div>
                                <div className="order-item-info">
                                  <span className="cell-strong">{it.design_name}</span>
                                  <span className="muted">
                                    {it.design_category ? CATEGORY[it.design_category] : 'Design no longer available'}
                                  </span>
                                </div>
                                <span className="order-item-price">
                                  {money(it.final_price)}
                                  {Number(it.price) > Number(it.final_price) && <s>{money(it.price)}</s>}
                                </span>
                              </div>
                            ))}
                            <div className="order-sum">
                              <span>Designs {money(o.items_total)}</span>
                              {Number(o.platform_fee) > 0 && <span>Fee {money(o.platform_fee)}</span>}
                              <strong>Total {money(o.total)}</strong>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {loading && orders.length === 0 && <tr className="empty"><td colSpan={8}>Loading orders…</td></tr>}
            {!loading && !error && orders.length === 0 && (
              <tr className="empty"><td colSpan={8}>{query || status !== 'all' ? 'No orders match.' : 'No orders yet.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ScrollFooter list={list} noun="orders" />
    </div>
  );
}
