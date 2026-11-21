import { Fragment, useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon, ArrowRight01Icon, ArrowDown01Icon, Call02Icon, Mail01Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { fetchDesignRequests, fetchDesignRequestSummary, updateDesignRequest, deleteDesignRequest, designRequestImageUrl } from '../api';
import useInfiniteList from '../useInfiniteList';
import ScrollFooter from '../components/ScrollFooter';

const LIMIT = 30;
const MAX_NOTE = 2000;
const FILTERS = [['new', 'New'], ['contacted', 'Contacted'], ['done', 'Done'], ['all', 'All']];
const LABEL = { new: 'New', contacted: 'Contacted', done: 'Done' };
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

function ago(d) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

export default function DesignRequests() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('new'); // what needs a reply first
  const [summary, setSummary] = useState(null);
  const [open, setOpen] = useState({});
  const [notes, setNotes] = useState({}); // request id -> note being typed
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState({});
  const [done, setDone] = useState('');

  const loadSummary = () => fetchDesignRequestSummary().then(setSummary).catch(() => {});
  useEffect(() => { loadSummary(); }, []);
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const list = useInfiniteList(
    ({ offset, limit, signal }) => fetchDesignRequests({ search: query, status, offset, limit, signal }),
    [query, status],
    LIMIT,
    (r) => r.id
  );
  const { items, loading, error: loadError } = list;

  const toggle = (r) => setOpen((o) => { if (o[r.id]) { const { [r.id]: _x, ...rest } = o; return rest; } return { ...o, [r.id]: true }; });
  const noteFor = (r) => (notes[r.id] !== undefined ? notes[r.id] : r.admin_note || '');

  async function save(r, change, message) {
    setBusy(r.id);
    setError((e) => ({ ...e, [r.id]: undefined }));
    try {
      const saved = await updateDesignRequest(r.id, change);
      setDone(`${message} for ${r.name}.`);
      setNotes((x) => { const { [r.id]: _y, ...rest } = x; return rest; });
      // a request that no longer matches the open filter leaves the list; otherwise it just changes
      if (status !== 'all' && saved.status !== status) list.removeWhere((x) => x.id === r.id);
      else list.updateWhere((x) => x.id === r.id, { status: saved.status, admin_note: saved.admin_note });
      loadSummary();
    } catch (e) {
      setError((m) => ({ ...m, [r.id]: e.message }));
    } finally {
      setBusy(null);
    }
  }

  async function remove(r) {
    if (!window.confirm(`Delete the request from ${r.name}? Its pictures are deleted too.`)) return;
    setBusy(r.id);
    try {
      await deleteDesignRequest(r.id);
      setDone(`Deleted the request from ${r.name}.`);
      list.removeWhere((x) => x.id === r.id);
      loadSummary();
    } catch (e) {
      setError((m) => ({ ...m, [r.id]: e.message }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="doubts">
      <div className="stats">
        <div className="kpi"><span className="stat-label">New requests</span><strong className="stat-value">{summary ? summary.new : '—'}</strong><span className="stat-hint">{summary ? (summary.new ? `oldest sent ${ago(summary.oldestNew)}` : 'you’re all caught up') : ''}</span></div>
        <div className="kpi"><span className="stat-label">Contacted</span><strong className="stat-value">{summary ? summary.contacted : '—'}</strong><span className="stat-hint">in progress</span></div>
        <div className="kpi"><span className="stat-label">Done</span><strong className="stat-value">{summary ? summary.done : '—'}</strong><span className="stat-hint">finished work</span></div>
        <div className="kpi"><span className="stat-label">All requests</span><strong className="stat-value">{summary ? summary.total : '—'}</strong><span className="stat-hint">ever received</span></div>
      </div>

      <div className="toolbar">
        <div className="search wide">
          <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.5} />
          <input placeholder="Search a name, phone, email or requirement" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="segmented">
          {FILTERS.map(([v, label]) => (
            <button key={v} className={status === v ? 'on' : ''} onClick={() => setStatus(v)}>
              {label}{summary && v !== 'all' ? <span className="seg-count">{summary[v]}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {done && <div className="notice done"><span>{done}</span><button className="btn small" onClick={() => setDone('')}>Dismiss</button></div>}
      {loadError && <div className="notice">Could not load requests: {loadError}</div>}

      <div className={`table-wrap${loading && items.length ? ' loading' : ''}`}>
        <table className="orders-table doubts-table">
          <thead>
            <tr><th className="col-toggle" /><th>Customer</th><th>Requirement</th><th>Pictures</th><th>Received</th><th>Status</th></tr>
          </thead>
          <tbody>
            {items.map((r) => {
              const isOpen = Boolean(open[r.id]);
              return (
                <Fragment key={r.id}>
                  <tr className={`clickable-row${isOpen ? ' is-open' : ''}`} tabIndex={0} aria-expanded={isOpen} onClick={() => toggle(r)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (e.preventDefault(), toggle(r))}>
                    <td className="col-toggle" data-label=""><HugeiconsIcon icon={isOpen ? ArrowDown01Icon : ArrowRight01Icon} size={16} strokeWidth={1.5} /></td>
                    <td data-label="Customer">
                      <div className="customer-cell">
                        <span className="cell-strong">{r.name}</span>
                        <span className="muted">{r.phone}</span>
                      </div>
                    </td>
                    <td data-label="Requirement" className="wrap"><span className="question-preview">{r.requirement}</span></td>
                    <td data-label="Pictures">{r.image_count ? `${r.image_count} attached` : <span className="muted">—</span>}</td>
                    <td data-label="Received">{fmtDate(r.created_at)} <span className="muted">{r.status === 'new' ? `· ${ago(r.created_at)}` : ''}</span></td>
                    <td data-label="Status"><span className={`status ${r.status === 'new' ? 'suspended' : 'active'}`}>{LABEL[r.status]}</span></td>
                  </tr>

                  {isOpen && (
                    <tr className="order-items-row">
                      <td colSpan={6}>
                        <div className="doubt-detail">
                          <h4 className="sub-title">What they need</h4>
                          <div className="question-box">{r.requirement}</div>
                          {r.notes && (<><h4 className="sub-title">Their notes</h4><div className="question-box">{r.notes}</div></>)}

                          <h4 className="sub-title">Contact</h4>
                          <div className="request-contact">
                            <strong>{r.name}</strong>
                            <a href={`tel:${r.phone.replace(/[^\d+]/g, '')}`}><HugeiconsIcon icon={Call02Icon} size={16} strokeWidth={1.6} /> {r.phone}</a>
                            <a href={`mailto:${r.email}`}><HugeiconsIcon icon={Mail01Icon} size={16} strokeWidth={1.6} /> {r.email}</a>
                            <span className="muted">Sent {fmtDate(r.created_at)} {fmtTime(r.created_at)} from {r.source === 'app' ? 'the mobile app' : 'the website'}</span>
                          </div>

                          {r.image_count > 0 && (
                            <>
                              <h4 className="sub-title">Pictures they attached</h4>
                              <div className="request-images">
                                {Array.from({ length: r.image_count }, (_, i) => (
                                  <a key={i} href={designRequestImageUrl(r.id, i + 1)} target="_blank" rel="noreferrer" title="Open full size">
                                    <img src={designRequestImageUrl(r.id, i + 1)} alt={`Picture ${i + 1} from ${r.name}`} loading="lazy" />
                                  </a>
                                ))}
                              </div>
                            </>
                          )}

                          <h4 className="sub-title">Your private note</h4>
                          <textarea className="answer-box" rows={3} maxLength={MAX_NOTE} placeholder="Notes for yourself: what was agreed, the price quoted…"
                            aria-label={`Note about ${r.name}`} value={noteFor(r)} onChange={(e) => setNotes((x) => ({ ...x, [r.id]: e.target.value }))} />
                          <div className="answer-foot">
                            <span className={error[r.id] ? 'field-error' : 'counter'}>{error[r.id] || `${noteFor(r).length}/${MAX_NOTE}`}</span>
                            <div className="answer-actions">
                              <button type="button" className="btn" onClick={() => remove(r)} disabled={busy === r.id} title="Delete this request">
                                <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={1.6} /> Delete
                              </button>
                              <button type="button" className="btn" onClick={() => save(r, { admin_note: noteFor(r) }, 'Note saved')} disabled={busy === r.id || noteFor(r) === (r.admin_note || '')}>Save note</button>
                              {r.status === 'new' && <button type="button" className="btn primary" onClick={() => save(r, { status: 'contacted', admin_note: noteFor(r) }, 'Marked as contacted')} disabled={busy === r.id}>Mark contacted</button>}
                              {r.status === 'contacted' && <button type="button" className="btn primary" onClick={() => save(r, { status: 'done', admin_note: noteFor(r) }, 'Marked as done')} disabled={busy === r.id}>Mark done</button>}
                              {r.status === 'done' && <button type="button" className="btn" onClick={() => save(r, { status: 'new' }, 'Reopened the request')} disabled={busy === r.id}>Reopen</button>}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {loading && items.length === 0 && <tr className="empty"><td colSpan={6}>Loading requests…</td></tr>}
            {!loading && !loadError && items.length === 0 && (
              <tr className="empty"><td colSpan={6}>
                {query ? 'No requests match.' : status === 'new' ? 'No new requests. You’re all caught up.' : 'No requests here yet.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ScrollFooter list={list} noun="requests" />
    </div>
  );
}
