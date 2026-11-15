import { Fragment, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons';

// Pieces shared by the Courses list and the Course details page.

export const money = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const dash = <span className="muted">—</span>;
const yes = (v) => (v ? 'Yes' : 'No');

// 64024 -> "17h 47m"   (course totals)
export function longDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}
// 2759 -> "45:59"   (one video)
export function clock(sec) {
  if (sec == null) return '—';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
export function fileSize(b) {
  if (b == null) return '—';
  if (b >= 1048576) return `${(b / 1048576).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(b / 1024))} KB`;
}
const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
// published = filled dot, draft = hollow dot
export const Published = ({ on }) => <span className={`status ${on ? 'active' : 'suspended'}`}>{on ? 'Published' : 'Draft'}</span>;

function Curriculum({ sections }) {
  // every section starts open, so the videos in it are visible straight away
  const [open, setOpen] = useState(() => Object.fromEntries(sections.map((s) => [s.id, true])));
  const toggle = (id) => setOpen((o) => { if (o[id]) { const { [id]: _x, ...rest } = o; return rest; } return { ...o, [id]: true }; });
  if (!sections.length) return <p className="muted">No sections yet.</p>;
  const videoTotal = sections.reduce((n, s) => n + s.videos.length, 0);
  const allOpen = sections.every((s) => open[s.id]);
  const setAll = (on) => setOpen(on ? Object.fromEntries(sections.map((s) => [s.id, true])) : {});
  return (
    <>
    <div className="curriculum-bar">
      <span className="muted">{sections.length} sections · {videoTotal} videos</span>
      <button type="button" className="link-btn" onClick={() => setAll(!allOpen)}>{allOpen ? 'Collapse all' : 'Expand all'}</button>
    </div>
    <table className="sub-table">
      <thead>
        <tr><th className="col-toggle" /><th>#</th><th>Section</th><th className="num">Videos</th><th className="num">Duration</th><th>Status</th></tr>
      </thead>
      <tbody>
        {sections.map((s) => (
          <Fragment key={s.id}>
            <tr className={`clickable-row${open[s.id] ? ' is-open' : ''}`} tabIndex={0} aria-expanded={Boolean(open[s.id])} onClick={() => toggle(s.id)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggle(s.id))}>
              <td className="col-toggle" data-label="">
                <HugeiconsIcon icon={open[s.id] ? ArrowDown01Icon : ArrowRight01Icon} size={16} strokeWidth={1.5} />
              </td>
              <td data-label="#">{s.position}</td>
              <td data-label="Section" className="cell-strong">{s.title}</td>
              <td data-label="Videos" className="num">{s.videos.length || <span className="muted">0</span>}</td>
              <td data-label="Duration" className="num">{longDuration(s.duration_seconds)}</td>
              <td data-label="Status"><Published on={s.is_published} /></td>
            </tr>
            {open[s.id] && (
              <tr className="nested-row">
                <td colSpan={6}>
                  {s.videos.length === 0 ? <span className="muted">No videos in this section.</span> : (
                    <table className="sub-table nested">
                      <thead>
                        <tr><th>#</th><th>Video</th><th className="num">Length</th><th>Free preview</th><th>Status</th><th>Quality</th><th className="num">Files</th></tr>
                      </thead>
                      <tbody>
                        {s.videos.map((v) => (
                          <tr key={v.id}>
                            <td data-label="#">{v.position}</td>
                            <td data-label="Video">{v.title}</td>
                            <td data-label="Length" className="num">{clock(v.duration_seconds)}</td>
                            <td data-label="Free preview">{yes(v.is_free_preview)}</td>
                            <td data-label="Status"><Published on={v.is_published} /></td>
                            <td data-label="Quality">{v.available_resolutions?.length ? `up to ${v.available_resolutions.at(-1)}` : dash}</td>
                            <td data-label="Files" className="num">{v.resource_count || dash}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </td>
              </tr>
            )}
          </Fragment>
        ))}
      </tbody>
    </table>
    </>
  );
}

function SimpleTable({ head, rows, empty }) {
  if (!rows.length) return <p className="muted">{empty}</p>;
  return (
    <table className="sub-table">
      <thead><tr>{head.map((h) => <th key={h.label} className={h.num ? 'num' : ''}>{h.label}</th>)}</tr></thead>
      <tbody>
        {rows.map((cells, i) => (
          <tr key={i}>{cells.map((c, j) => <td key={j} data-label={head[j].label} className={head[j].num ? 'num' : head[j].wrap ? 'wrap' : ''}>{c}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

/** The tabbed content of one course: curriculum, learning points, practice files, software, reviews, promotion. */
export function CourseTabs({ data }) {
  const tabs = [
    ['curriculum', 'Curriculum', data.sections.length],
    ['learn', 'What students learn', data.learningPoints.length],
    ['files', 'Practice files', data.resources.length],
    ['software', 'Software', data.software.length],
    ['reviews', 'Reviews', data.reviews.length],
    ...(data.promotions.length ? [['promo', 'Promotion', data.promotions.length]] : []),
  ];
  const [tab, setTab] = useState('curriculum');

  return (
    <div className="sub-tables">
      <div className="segmented tab-bar">
        {tabs.map(([key, label, n]) => (
          <button key={key} className={tab === key ? 'on' : ''} onClick={() => setTab(key)}>{label} <span className="tab-count">{n}</span></button>
        ))}
      </div>

      {tab === 'curriculum' && <Curriculum sections={data.sections} />}

      {tab === 'learn' && (
        <SimpleTable
          head={[{ label: '#' }, { label: 'Students will learn', wrap: true }]}
          rows={data.learningPoints.map((p) => [p.position, p.text])}
          empty="No learning points yet."
        />
      )}

      {tab === 'files' && (
        <SimpleTable
          head={[{ label: 'File' }, { label: 'Type' }, { label: 'Size', num: true }, { label: 'Video', wrap: true }, { label: 'Section', wrap: true }, { label: 'Status' }, { label: 'Link' }]}
          rows={data.resources.map((r) => [
            r.title || r.file_name,
            r.resource_type.replace('_', ' '),
            fileSize(r.file_size),
            r.video_title || dash,
            r.section_title || dash,
            <Published key="p" on={r.is_published} />,
            r.file_url ? <a className="file-link" href={r.file_url} target="_blank" rel="noreferrer">Open</a> : dash,
          ])}
          empty="No practice files yet."
        />
      )}

      {tab === 'software' && (
        <SimpleTable
          head={[{ label: 'Software', wrap: true }, { label: 'Platform' }, { label: 'Required' }, { label: 'Download' }, { label: 'Installation steps', wrap: true }]}
          rows={data.software.map((s) => [
            s.name,
            s.platform || dash,
            yes(s.is_required),
            <a key="d" className="file-link" href={s.download_url} target="_blank" rel="noreferrer">Open</a>,
            s.description ? <details key="i"><summary>Show steps</summary><div className="steps">{s.description}</div></details> : dash,
          ])}
          empty="No software listed."
        />
      )}

      {tab === 'reviews' && (
        <SimpleTable
          head={[{ label: 'Student' }, { label: 'Rating' }, { label: 'Review', wrap: true }, { label: 'Status' }, { label: 'Date' }]}
          rows={data.reviews.map((r) => [
            r.reviewer || dash,
            <span key="s" className="stars" title={`${r.rating} out of 5`}>{stars(r.rating)}</span>,
            r.review_text || <span className="muted">No written review</span>,
            <Published key="p" on={r.is_published} />,
            fmtDate(r.created_at),
          ])}
          empty="No reviews yet."
        />
      )}

      {tab === 'promo' && (
        <SimpleTable
          head={[{ label: 'Headline', wrap: true }, { label: 'Text', wrap: true }, { label: 'Button' }, { label: 'Shown to' }, { label: 'Active' }]}
          rows={data.promotions.map((p) => [p.title, p.sub_text || dash, p.button_text || dash, p.target_users, yes(p.is_active)])}
          empty="No promotion."
        />
      )}
    </div>
  );
}

