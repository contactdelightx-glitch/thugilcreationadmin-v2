import { Fragment, useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon, ArrowRight01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { fetchCertificates, fetchCertificateSummary, certificateFileUrl } from '../api';
import IssueCertificateModal from '../components/IssueCertificateModal';
import useInfiniteList from '../useInfiniteList';
import ScrollFooter from '../components/ScrollFooter';

const LIMIT = 30;
const FILTERS = [['all', 'All'], ['issued', 'Issued'], ['requested', 'Requested'], ['not_requested', 'Not requested']];
const LABEL = { issued: 'Issued', requested: 'Requested', not_requested: 'Not requested' };
// issued = filled dot; requested / not requested = hollow dots
const STYLE = { issued: 'active', requested: 'suspended', not_requested: 'removed' };
const money = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const dash = <span className="muted">—</span>;

function Details({ c }) {
  if (c.status === 'not_requested') {
    return (
      <div className="sub-tables">
        <p className="muted cert-note">The student bought a certificate with this course ({money(c.certificate_fee)}) but hasn’t requested it yet. Course progress: {c.progress_percentage}%.</p>
      </div>
    );
  }
  return (
    <div className="sub-tables">
      <h4 className="sub-title">Certificate details</h4>
      <table className="sub-table">
        <thead>
          <tr><th>Name on certificate</th><th>Sent to</th><th>Shipping address</th><th>Requested</th><th>Issued</th><th>Paid for</th><th className="num">Course progress</th></tr>
        </thead>
        <tbody>
          <tr>
            <td data-label="Name on certificate">{[c.name_title, c.name_on_certificate].filter(Boolean).join(' ') || dash}</td>
            <td data-label="Sent to">{c.delivery_email || dash}</td>
            <td data-label="Shipping address" className="wrap">{c.shipping_address || dash}</td>
            <td data-label="Requested">{fmtDate(c.requested_at)}</td>
            <td data-label="Issued">{fmtDate(c.issued_at)}</td>
            <td data-label="Paid for">{money(c.certificate_fee)}</td>
            <td data-label="Course progress" className="num">{c.progress_percentage}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function Certificates() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [summary, setSummary] = useState(null);
  const [open, setOpen] = useState({}); // enrollment id -> true
  const [issuing, setIssuing] = useState(null); // { cert, replace }: the certificate whose file is being uploaded

  useEffect(() => { fetchCertificateSummary().then(setSummary).catch(() => {}); }, []);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const list = useInfiniteList(
    ({ offset, limit, signal }) => fetchCertificates({ search: query, status, offset, limit, signal }),
    [query, status],
    LIMIT,
    (c) => c.enrollment_id
  );
  const { items: certs, loading, error } = list;
  const done = () => { setIssuing(null); fetchCertificateSummary().then(setSummary).catch(() => {}); list.reload(); };
  const toggle = (id) => setOpen((o) => { if (o[id]) { const { [id]: _x, ...rest } = o; return rest; } return { ...o, [id]: true }; });

  return (
    <div className="certificates">
      <div className="stats">
        <div className="kpi"><span className="stat-label">Issued</span><strong className="stat-value">{summary ? summary.issued : '—'}</strong><span className="stat-hint">certificates sent to students</span></div>
        <div className="kpi"><span className="stat-label">Waiting to be issued</span><strong className="stat-value">{summary ? summary.requested : '—'}</strong><span className="stat-hint">requested by students</span></div>
        <div className="kpi"><span className="stat-label">Not requested yet</span><strong className="stat-value">{summary ? summary.notRequested : '—'}</strong><span className="stat-hint">bought but not asked for</span></div>
        <div className="kpi"><span className="stat-label">Certificate revenue</span><strong className="stat-value">{summary ? money(summary.revenue) : '—'}</strong><span className="stat-hint">{summary ? `from ${summary.total} certificates sold` : ''}</span></div>
      </div>

      <div className="toolbar">
        <div className="search wide">
          <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.5} />
          <input placeholder="Search student, certificate no. or course" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="segmented">
          {FILTERS.map(([v, label]) => <button key={v} className={status === v ? 'on' : ''} onClick={() => setStatus(v)}>{label}</button>)}
        </div>
      </div>

      {error && <div className="notice">Could not load certificates: {error}</div>}

      <div className={`table-wrap${loading && certs.length ? ' loading' : ''}`}>
        <table className="orders-table cert-table">
          <thead>
            <tr>
              <th className="col-toggle" />
              <th>Certificate no.</th>
              <th>Student</th>
              <th>Course</th>
              <th>Status</th>
              <th>Requested</th>
              <th>Issued</th>
              <th>File / action</th>
            </tr>
          </thead>
          <tbody>
            {certs.map((c) => {
              const isOpen = Boolean(open[c.enrollment_id]);
              return (
                <Fragment key={c.enrollment_id}>
                  <tr className={`clickable-row${isOpen ? ' is-open' : ''}`} onClick={() => toggle(c.enrollment_id)}>
                    <td className="col-toggle" data-label="">
                      <HugeiconsIcon icon={isOpen ? ArrowDown01Icon : ArrowRight01Icon} size={16} strokeWidth={1.5} />
                    </td>
                    <td data-label="Certificate no."><span className="mono">{c.certificate_number || '—'}</span></td>
                    <td data-label="Student">
                      <div className="customer-cell">
                        <span className="cell-strong">{c.student_name || c.student_email}</span>
                        {c.student_name && <span className="muted">{c.student_email}</span>}
                      </div>
                    </td>
                    <td data-label="Course"><span className="course-name">{c.course_title}</span></td>
                    <td data-label="Status"><span className={`status ${STYLE[c.status]}`}>{LABEL[c.status]}</span></td>
                    <td data-label="Requested">{fmtDate(c.requested_at)}</td>
                    <td data-label="Issued">{fmtDate(c.issued_at)}</td>
                    <td data-label="File" onClick={(e) => e.stopPropagation()}>
                      {c.status === 'requested' ? (
                        <button type="button" className="btn primary" onClick={() => setIssuing({ cert: c, replace: false })}>Approve &amp; issue</button>
                      ) : c.status === 'issued' ? (
                        <span className="cert-actions">
                          <a className="file-link" href={certificateFileUrl(c.enrollment_id)} target="_blank" rel="noreferrer">Open</a>
                          <button type="button" className="link-btn" onClick={() => setIssuing({ cert: c, replace: true })}>Replace</button>
                        </span>
                      ) : dash}
                    </td>
                  </tr>
                  {isOpen && <tr className="order-items-row"><td colSpan={8}><Details c={c} /></td></tr>}
                </Fragment>
              );
            })}
            {loading && certs.length === 0 && <tr className="empty"><td colSpan={8}>Loading certificates…</td></tr>}
            {!loading && !error && certs.length === 0 && (
              <tr className="empty"><td colSpan={8}>{query || status !== 'all' ? 'No certificates match.' : 'No certificates yet.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ScrollFooter list={list} noun="certificates" />
      {issuing && <IssueCertificateModal cert={issuing.cert} replace={issuing.replace} onClose={() => setIssuing(null)} onDone={done} />}
    </div>
  );
}
