import { useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { fetchRatings, fetchRatingSummary } from '../api';
import useInfiniteList from '../useInfiniteList';
import ScrollFooter from '../components/ScrollFooter';

const LIMIT = 30;
const FILTERS = [['all', 'All'], ['reviewed', 'With a review'], ['designs', 'About a design'], ['general', 'About the site']];
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const Stars = ({ n }) => <span className="stars" title={`${n} out of 5`} aria-label={`${n} out of 5 stars`}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;

export default function Ratings() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [summary, setSummary] = useState(null);

  useEffect(() => { fetchRatingSummary().then(setSummary).catch(() => {}); }, []);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const list = useInfiniteList(
    ({ offset, limit, signal }) => fetchRatings({ search: query, filter, offset, limit, signal }),
    [query, filter],
    LIMIT,
    (r) => r.id
  );
  const { items: ratings, loading, error } = list;

  return (
    <div className="ratings">
      <div className="stats">
        <div className="kpi"><span className="stat-label">Average rating</span><strong className="stat-value">{summary ? (summary.total ? `${summary.average.toFixed(1)} ★` : '—') : '—'}</strong><span className="stat-hint">out of 5</span></div>
        <div className="kpi"><span className="stat-label">Ratings</span><strong className="stat-value">{summary ? summary.total : '—'}</strong><span className="stat-hint">{summary ? `${summary.last30Days} in the last 30 days` : ''}</span></div>
        <div className="kpi"><span className="stat-label">With a written review</span><strong className="stat-value">{summary ? summary.withReview : '—'}</strong><span className="stat-hint">{summary && summary.total ? `${Math.round((summary.withReview / summary.total) * 100)}% of ratings` : ''}</span></div>
        <div className="kpi"><span className="stat-label">About a design</span><strong className="stat-value">{summary ? summary.forDesigns : '—'}</strong><span className="stat-hint">{summary ? `${summary.general} are about the site` : ''}</span></div>
      </div>

      <div className="toolbar">
        <div className="search wide">
          <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.5} />
          <input placeholder="Search a review or design name" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="segmented">
          {FILTERS.map(([v, label]) => <button key={v} className={filter === v ? 'on' : ''} onClick={() => setFilter(v)}>{label}</button>)}
        </div>
      </div>

      {error && <div className="notice">Could not load ratings: {error}</div>}

      <div className={`table-wrap${loading && ratings.length ? ' loading' : ''}`}>
        <table className="orders-table rating-table">
          <thead>
            <tr><th>Date</th><th>Rating</th><th>Review</th><th>About</th></tr>
          </thead>
          <tbody>
            {ratings.map((r) => (
              <tr key={r.id}>
                <td data-label="Date">{fmtDate(r.created_at)} <span className="muted">{fmtTime(r.created_at)}</span></td>
                <td data-label="Rating"><Stars n={r.rating} /></td>
                <td data-label="Review" className="wrap">{r.review ? <span className="review-text">{r.review}</span> : <span className="muted">No written review</span>}</td>
                <td data-label="About">
                  {r.design_id
                    ? (
                      <div className="customer-cell">
                        <span className="cell-strong">{r.design_name || (r.design_category === 'free_image' ? 'Free image' : 'Design removed')}</span>
                        <span className="muted">{r.design_category_label || 'Category unknown'}</span>
                      </div>
                    )
                    : <span className="muted">The site (general)</span>}
                </td>
              </tr>
            ))}
            {loading && ratings.length === 0 && <tr className="empty"><td colSpan={4}>Loading ratings…</td></tr>}
            {!loading && !error && ratings.length === 0 && (
              <tr className="empty"><td colSpan={4}>{query || filter !== 'all' ? 'No ratings match.' : 'No ratings yet.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ScrollFooter list={list} noun="ratings" />
    </div>
  );
}
