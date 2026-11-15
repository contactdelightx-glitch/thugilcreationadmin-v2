import { Fragment, useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon, ArrowRight01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { fetchStudents, fetchStudentSummary, fetchStudentEnrollments } from '../api';
import useInfiniteList from '../useInfiniteList';
import ScrollFooter from '../components/ScrollFooter';

const LIMIT = 30;
const money = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const dash = <span className="muted">—</span>;

function ago(d) {
  if (!d) return '—';
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return fmtDate(d);
}

function Progress({ value, done }) {
  return (
    <div className="progress" title={`${value}% complete`}>
      <div className="progress-track"><span style={{ width: `${value}%` }} /></div>
      <span className="progress-num">{done ? 'Done' : `${value}%`}</span>
    </div>
  );
}

// what was bought, spelled out under the amount
const breakdown = (e) =>
  `${money(e.base_price)} course${e.discount_amount > 0 ? ` − ${money(e.discount_amount)} discount` : ''}${e.certificate_fee > 0 ? ` + ${money(e.certificate_fee)} certificate` : ''}${e.doubt_support_fee > 0 ? ` + ${money(e.doubt_support_fee)} doubt support` : ''}`;

// the expanded part: one table for the enrollments, one for certificates (only if there are any)
function EnrollmentTables({ items }) {
  const withCertificate = items.filter((e) => e.certificate_status);
  return (
    <div className="sub-tables">
      <h4 className="sub-title">Enrollments</h4>
      <table className="sub-table">
        <thead>
          <tr>
            <th>Course</th>
            <th>Paid</th>
            <th>Payment</th>
            <th>Payment ID</th>
            <th>Enrolled</th>
            <th>Access until</th>
            <th>Last active</th>
            <th>Videos</th>
            <th>Add-ons</th>
          </tr>
        </thead>
        <tbody>
          {items.map((e) => (
            <tr key={e.id}>
              <td data-label="Course" className="cell-strong">{e.course_title}</td>
              <td data-label="Paid">
                <span className="cell-strong">{money(e.amount_paid)}</span>
                <span className="sub-note">{breakdown(e)}</span>
              </td>
              <td data-label="Payment">{cap(e.payment_status)}{e.payment_method ? ` · ${cap(e.payment_method)}` : ''}</td>
              <td data-label="Payment ID"><span className="mono">{e.razorpay_payment_id || '—'}</span></td>
              <td data-label="Enrolled">{fmtDate(e.enrolled_at)}</td>
              <td data-label="Access until">
                {fmtDate(e.expires_at)}
                {e.access_duration_days ? <span className="sub-note">{e.access_duration_days} days</span> : null}
              </td>
              <td data-label="Last active">{ago(e.last_accessed_at)}</td>
              <td data-label="Videos">{e.videos_started ? `${e.videos_completed} of ${e.videos_started} done` : dash}</td>
              <td data-label="Add-ons">
                {[e.certificate_included && 'Certificate', e.doubt_support_included && 'Doubt support'].filter(Boolean).join(', ') || dash}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {withCertificate.length > 0 && (
        <>
          <h4 className="sub-title">Certificates</h4>
          <table className="sub-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Status</th>
                <th>Number</th>
                <th>Name on certificate</th>
                <th>Sent to</th>
                <th>Shipping address</th>
                <th>Requested</th>
                <th>Issued</th>
                <th>File</th>
              </tr>
            </thead>
            <tbody>
              {withCertificate.map((e) => (
                <tr key={e.id}>
                  <td data-label="Course">{e.course_title}</td>
                  <td data-label="Status"><span className={`status ${e.certificate_status === 'issued' ? 'active' : 'suspended'}`}>{cap(e.certificate_status)}</span></td>
                  <td data-label="Number"><span className="mono">{e.certificate_number || '—'}</span></td>
                  <td data-label="Name on certificate">{[e.certificate_title, e.certificate_name].filter(Boolean).join(' ') || dash}</td>
                  <td data-label="Sent to">{e.certificate_email || dash}</td>
                  <td data-label="Shipping address" className="wrap">{e.certificate_address || dash}</td>
                  <td data-label="Requested">{fmtDate(e.certificate_requested_at)}</td>
                  <td data-label="Issued">{fmtDate(e.certificate_issued_at)}</td>
                  <td data-label="File">{e.certificate_url ? <a className="file-link" href={e.certificate_url} target="_blank" rel="noreferrer">Open</a> : dash}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export default function Students() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [summary, setSummary] = useState(null);
  const [open, setOpen] = useState({}); // customer id -> { loading, items, error }

  useEffect(() => { fetchStudentSummary().then(setSummary).catch(() => {}); }, []);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const list = useInfiniteList(
    ({ offset, limit, signal }) => fetchStudents({ search: query, offset, limit, signal }),
    [query],
    LIMIT,
    (s) => s.customer_id
  );
  const { items: students, loading, error } = list;

  async function toggle(s) {
    if (open[s.customer_id]) return setOpen((o) => { const { [s.customer_id]: _x, ...rest } = o; return rest; });
    setOpen((o) => ({ ...o, [s.customer_id]: { loading: true, items: null, error: '' } }));
    try {
      const items = await fetchStudentEnrollments(s.customer_id);
      setOpen((o) => (o[s.customer_id] ? { ...o, [s.customer_id]: { loading: false, items, error: '' } } : o));
    } catch (e) {
      setOpen((o) => (o[s.customer_id] ? { ...o, [s.customer_id]: { loading: false, items: null, error: e.message } } : o));
    }
  }

  return (
    <div className="students">
      <div className="stats">
        <div className="kpi"><span className="stat-label">Students</span><strong className="stat-value">{summary ? summary.students : '—'}</strong><span className="stat-hint">have purchased a course</span></div>
        <div className="kpi"><span className="stat-label">Course revenue</span><strong className="stat-value">{summary ? money(summary.revenue) : '—'}</strong><span className="stat-hint">{summary ? `from ${summary.enrollments} enrollments` : ''}</span></div>
        <div className="kpi"><span className="stat-label">Average progress</span><strong className="stat-value">{summary ? `${summary.avgProgress}%` : '—'}</strong><span className="stat-hint">{summary ? `${summary.completed} finished the course` : ''}</span></div>
        <div className="kpi"><span className="stat-label">Certificates issued</span><strong className="stat-value">{summary ? summary.certificatesIssued : '—'}</strong><span className="stat-hint">{summary ? `${summary.certificatesIncluded} bought with a certificate` : ''}</span></div>
      </div>

      <div className="toolbar">
        <div className="search wide">
          <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.5} />
          <input placeholder="Search name, email, phone or course" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {summary && <span className="muted client-summary">{summary.students} students</span>}
      </div>

      {error && <div className="notice">Could not load students: {error}</div>}

      <div className={`table-wrap${loading && students.length ? ' loading' : ''}`}>
        <table className="students-table">
          <thead>
            <tr>
              <th className="col-toggle" />
              <th>Student</th>
              <th>Phone</th>
              <th>Course</th>
              <th>Enrolled</th>
              <th className="num">Paid</th>
              <th>Progress</th>
              <th>Certificate</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const details = open[s.customer_id];
              return (
                <Fragment key={s.customer_id}>
                  <tr className={`clickable-row${details ? ' is-open' : ''}`} onClick={() => toggle(s)}>
                    <td className="col-toggle" data-label="">
                      <HugeiconsIcon icon={details ? ArrowDown01Icon : ArrowRight01Icon} size={16} strokeWidth={1.5} />
                    </td>
                    <td data-label="Student">
                      <div className="customer-cell">
                        <span className="cell-strong">{s.full_name || s.email}</span>
                        {s.full_name && <span className="muted">{s.email}</span>}
                      </div>
                    </td>
                    <td data-label="Phone">{s.phone || dash}</td>
                    <td data-label="Course">
                      <span className="course-name">{s.course_title}{s.enrollment_count > 1 ? <span className="muted"> +{s.enrollment_count - 1} more</span> : null}</span>
                    </td>
                    <td data-label="Enrolled">{fmtDate(s.enrolled_at)}</td>
                    <td data-label="Paid" className="num cell-strong">
                      <span className="paid">
                        {money(s.amount_paid)}
                        <span className="addons">
                          {s.certificate_included && <i>Certificate</i>}
                          {s.doubt_support_included && <i>Doubt support</i>}
                        </span>
                      </span>
                    </td>
                    <td data-label="Progress"><Progress value={s.progress_percentage} done={s.is_completed} /></td>
                    <td data-label="Certificate">
                      {s.certificate_status
                        ? <span className={`status ${s.certificate_status === 'issued' ? 'active' : 'suspended'}`}>{cap(s.certificate_status)}</span>
                        : <span className="muted">{s.certificate_included ? 'Not requested' : 'Not included'}</span>}
                    </td>
                  </tr>

                  {details && (
                    <tr className="order-items-row">
                      <td colSpan={8}>
                        {details.loading && <span className="muted">Loading details…</span>}
                        {details.error && <span>Could not load the details: {details.error}</span>}
                        {details.items && <EnrollmentTables items={details.items} />}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {loading && students.length === 0 && <tr className="empty"><td colSpan={8}>Loading students…</td></tr>}
            {!loading && !error && students.length === 0 && (
              <tr className="empty"><td colSpan={8}>{query ? 'No students match.' : 'No one has purchased a course yet.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ScrollFooter list={list} noun="students" />
    </div>
  );
}
