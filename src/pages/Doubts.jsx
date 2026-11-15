import { Fragment, useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon, ArrowRight01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { fetchDoubts, fetchDoubtSummary, answerDoubt } from '../api';
import useInfiniteList from '../useInfiniteList';
import ScrollFooter from '../components/ScrollFooter';

const LIMIT = 30;
const MAX_ANSWER = 5000;
const FILTERS = [['pending', 'Waiting'], ['answered', 'Answered'], ['all', 'All']];
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime = (d) => new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const dash = <span className="muted">—</span>;

function ago(d) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

export default function Doubts() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('pending'); // what needs clearing first
  const [summary, setSummary] = useState(null);
  const [open, setOpen] = useState({}); // doubt id -> true
  const [drafts, setDrafts] = useState({}); // doubt id -> text being typed
  const [saving, setSaving] = useState(null);
  const [saveError, setSaveError] = useState({}); // doubt id -> message
  const [done, setDone] = useState('');

  const loadSummary = () => fetchDoubtSummary().then(setSummary).catch(() => {});
  useEffect(() => { loadSummary(); }, []);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const list = useInfiniteList(
    ({ offset, limit, signal }) => fetchDoubts({ search: query, status, offset, limit, signal }),
    [query, status],
    LIMIT,
    (d) => d.id
  );
  const { items: doubts, loading, error } = list;

  const toggle = (d) => setOpen((o) => { if (o[d.id]) { const { [d.id]: _x, ...rest } = o; return rest; } return { ...o, [d.id]: true }; });
  const textFor = (d) => (drafts[d.id] !== undefined ? drafts[d.id] : d.answer || '');

  async function send(d) {
    const text = textFor(d).trim();
    if (!text) return setSaveError((e) => ({ ...e, [d.id]: 'Write an answer first.' }));
    setSaving(d.id);
    setSaveError((e) => ({ ...e, [d.id]: undefined }));
    try {
      const saved = await answerDoubt(d.id, text);
      const wasWaiting = d.status === 'pending';
      setDone(`${wasWaiting ? 'Answer sent' : 'Answer updated'} for ${d.student_name || d.student_email}.`);
      setOpen((o) => { const { [d.id]: _x, ...rest } = o; return rest; });
      setDrafts((x) => { const { [d.id]: _y, ...rest } = x; return rest; });
      // in the Waiting list an answered doubt is done with, so it leaves; elsewhere it just changes
      if (status === 'pending') list.removeWhere((x) => x.id === d.id);
      else list.updateWhere((x) => x.id === d.id, { status: 'answered', answer: saved.answer, answered_at: saved.answered_at });
      loadSummary();
    } catch (e) {
      setSaveError((m) => ({ ...m, [d.id]: e.message }));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="doubts">
      <div className="stats">
        <div className="kpi"><span className="stat-label">Waiting for an answer</span><strong className="stat-value">{summary ? summary.pending : '—'}</strong><span className="stat-hint">{summary ? (summary.pending ? `oldest asked ${ago(summary.oldestPending)}` : 'you’re all caught up') : ''}</span></div>
        <div className="kpi"><span className="stat-label">Answered</span><strong className="stat-value">{summary ? summary.answered : '—'}</strong><span className="stat-hint">doubts cleared</span></div>
        <div className="kpi"><span className="stat-label">All doubts</span><strong className="stat-value">{summary ? summary.total : '—'}</strong><span className="stat-hint">ever asked</span></div>
        <div className="kpi"><span className="stat-label">Students asking</span><strong className="stat-value">{summary ? summary.students : '—'}</strong><span className="stat-hint">different students</span></div>
      </div>

      <div className="toolbar">
        <div className="search wide">
          <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.5} />
          <input placeholder="Search a question, student or course" value={search} onChange={(e) => setSearch(e.target.value)} />
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
      {error && <div className="notice">Could not load doubts: {error}</div>}

      <div className={`table-wrap${loading && doubts.length ? ' loading' : ''}`}>
        <table className="orders-table doubts-table">
          <thead>
            <tr><th className="col-toggle" /><th>Student</th><th>Course</th><th>Question</th><th>Asked</th><th>Status</th></tr>
          </thead>
          <tbody>
            {doubts.map((d) => {
              const isOpen = Boolean(open[d.id]);
              const waiting = d.status === 'pending';
              return (
                <Fragment key={d.id}>
                  <tr className={`clickable-row${isOpen ? ' is-open' : ''}`} tabIndex={0} aria-expanded={isOpen} onClick={() => toggle(d)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (e.preventDefault(), toggle(d))}>
                    <td className="col-toggle" data-label="">
                      <HugeiconsIcon icon={isOpen ? ArrowDown01Icon : ArrowRight01Icon} size={16} strokeWidth={1.5} />
                    </td>
                    <td data-label="Student">
                      <div className="customer-cell">
                        <span className="cell-strong">{d.student_name || d.student_email}</span>
                        <span className="muted">{d.student_name ? d.student_email : ''}{d.has_doubt_support ? <span className="support-tag">Doubt support</span> : null}</span>
                      </div>
                    </td>
                    <td data-label="Course">
                      <div className="customer-cell">
                        <span className="course-name">{d.course_title}</span>
                        <span className="muted">{d.video_title || 'General question'}</span>
                      </div>
                    </td>
                    <td data-label="Question" className="wrap"><span className="question-preview">{d.question}</span></td>
                    <td data-label="Asked">{fmtDate(d.created_at)} <span className="muted">{waiting ? `· ${ago(d.created_at)}` : ''}</span></td>
                    <td data-label="Status"><span className={`status ${waiting ? 'suspended' : 'active'}`}>{waiting ? 'Waiting' : 'Answered'}</span></td>
                  </tr>

                  {isOpen && (
                    <tr className="order-items-row">
                      <td colSpan={6}>
                        <div className="doubt-detail">
                          <h4 className="sub-title">The question</h4>
                          <div className="question-box">{d.question}</div>

                          <table className="sub-table doubt-meta">
                            <thead><tr><th>Student</th><th>Course</th><th>Section</th><th>Video</th><th>Asked</th><th>Doubt support</th></tr></thead>
                            <tbody>
                              <tr>
                                <td data-label="Student">{d.student_name ? `${d.student_name} · ` : ''}{d.student_email}</td>
                                <td data-label="Course">{d.course_title}</td>
                                <td data-label="Section">{d.section_title || dash}</td>
                                <td data-label="Video">{d.video_title || dash}</td>
                                <td data-label="Asked">{fmtDate(d.created_at)} {fmtTime(d.created_at)}</td>
                                <td data-label="Doubt support">{d.has_doubt_support ? 'Bought' : 'Not bought'}</td>
                              </tr>
                            </tbody>
                          </table>

                          <h4 className="sub-title">{waiting ? 'Your answer' : `Your answer · sent ${fmtDate(d.answered_at)}`}</h4>
                          <textarea
                            className="answer-box"
                            rows={5}
                            maxLength={MAX_ANSWER}
                            placeholder="Write the answer the student will see…"
                            aria-label={`Answer for ${d.student_name || d.student_email}`}
                            value={textFor(d)}
                            onChange={(e) => setDrafts((x) => ({ ...x, [d.id]: e.target.value }))}
                          />
                          <div className="answer-foot">
                            <span className={saveError[d.id] ? 'field-error' : 'counter'}>{saveError[d.id] || `${textFor(d).length}/${MAX_ANSWER}`}</span>
                            <div className="answer-actions">
                              <button type="button" className="btn" onClick={() => toggle(d)} disabled={saving === d.id}>Close</button>
                              <button type="button" className="btn primary" onClick={() => send(d)} disabled={saving === d.id || !textFor(d).trim()}>
                                {saving === d.id ? 'Sending…' : waiting ? 'Send answer' : 'Update answer'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {loading && doubts.length === 0 && <tr className="empty"><td colSpan={6}>Loading doubts…</td></tr>}
            {!loading && !error && doubts.length === 0 && (
              <tr className="empty"><td colSpan={6}>
                {query ? 'No doubts match.' : status === 'pending' ? 'No doubts are waiting. You’re all caught up.' : status === 'answered' ? 'No answered doubts yet.' : 'No doubts yet.'}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ScrollFooter list={list} noun="doubts" />
    </div>
  );
}
