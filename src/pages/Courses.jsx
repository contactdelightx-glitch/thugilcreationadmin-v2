import { useEffect, useMemo, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon, ArrowRight01Icon, AddSquareIcon, Edit02Icon } from '@hugeicons/core-free-icons';
import { fetchCourses, fetchCourseSummary } from '../api';
import { money, longDuration, Published } from '../components/CourseParts';

export default function Courses({ onNavigate }) {
  const [courses, setCourses] = useState(null); // null while loading
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCourses().then(setCourses).catch((e) => setError(e.message));
    fetchCourseSummary().then(setSummary).catch(() => {});
  }, []);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (courses || []).filter((c) => !q || c.title.toLowerCase().includes(q) || (c.category || '').toLowerCase().includes(q));
  }, [courses, search]);

  const open = (c) => onNavigate('Course Details', { id: c.id });

  return (
    <div className="courses">
      <div className="stats">
        <div className="kpi"><span className="stat-label">Courses</span><strong className="stat-value">{summary ? summary.courses : '—'}</strong><span className="stat-hint">{summary ? `${summary.published} published` : ''}</span></div>
        <div className="kpi"><span className="stat-label">Content</span><strong className="stat-value">{summary ? `${summary.videos} videos` : '—'}</strong><span className="stat-hint">{summary ? `${summary.sections} sections · ${longDuration(summary.durationSeconds)}` : ''}</span></div>
        <div className="kpi"><span className="stat-label">Students</span><strong className="stat-value">{summary ? summary.students : '—'}</strong><span className="stat-hint">{summary ? `${money(summary.revenue)} earned` : ''}</span></div>
        <div className="kpi"><span className="stat-label">Rating</span><strong className="stat-value">{summary ? (summary.reviews ? `${summary.avgRating.toFixed(1)} ★` : '—') : '—'}</strong><span className="stat-hint">{summary ? `${summary.reviews} reviews` : ''}</span></div>
      </div>

      <div className="toolbar">
        <div className="search wide">
          <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.5} />
          <input placeholder="Search courses" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <span className="muted client-summary">Click a course to see its details</span>
        <button className="btn primary with-icon" onClick={() => onNavigate('Add Course')}>
          <HugeiconsIcon icon={AddSquareIcon} size={18} strokeWidth={1.5} /> Add course
        </button>
      </div>

      {error && <div className="notice">Could not load courses: {error}</div>}

      <div className="table-wrap">
        <table className="courses-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Status</th>
              <th className="num">Price</th>
              <th>Duration</th>
              <th>Content</th>
              <th className="num">Students</th>
              <th className="num">Revenue</th>
              <th>Rating</th>
              <th className="col-toggle" />
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => (
              <tr key={c.id} className="clickable-row" tabIndex={0} onClick={() => open(c)} onKeyDown={(e) => e.key === 'Enter' && open(c)}>
                <td data-label="Course">
                  <div className="customer-cell">
                    <span className="cell-strong">{c.title}</span>
                    <span className="muted">{[c.category, c.language].filter(Boolean).join(' · ')}</span>
                  </div>
                </td>
                <td data-label="Status"><Published on={c.is_published} /></td>
                <td data-label="Price" className="num cell-strong">
                  <span className="paid">
                    {money(c.price)}
                    {c.certificate_with_price != null && <span className="sub-note">{money(c.certificate_with_price)} with certificate</span>}
                  </span>
                </td>
                <td data-label="Duration">{c.duration || (c.duration_seconds ? longDuration(c.duration_seconds) : <span className="muted">No videos yet</span>)}</td>
                <td data-label="Content">{c.sections} {c.sections === 1 ? 'section' : 'sections'} · {c.videos} {c.videos === 1 ? 'video' : 'videos'}</td>
                <td data-label="Students" className="num">{c.students}</td>
                <td data-label="Revenue" className="num">{money(c.revenue)}</td>
                <td data-label="Rating">{c.review_count ? <span><span className="stars">★</span> {c.avg_rating.toFixed(1)} <span className="muted">({c.review_count})</span></span> : <span className="muted">No reviews</span>}</td>
                <td className="col-toggle row-end" data-label="">
                  <div className="row-end-inner">
                    <button className="btn edit-btn" title="Edit course" aria-label={`Edit ${c.title}`} onClick={(e) => { e.stopPropagation(); onNavigate('Edit Course', { id: c.id }); }}>
                      <HugeiconsIcon icon={Edit02Icon} size={16} strokeWidth={1.5} /> Edit
                    </button>
                    <HugeiconsIcon className="row-chevron" icon={ArrowRight01Icon} size={16} strokeWidth={1.5} />
                  </div>
                </td>
              </tr>
            ))}
            {!courses && !error && <tr className="empty"><td colSpan={9}>Loading courses…</td></tr>}
            {courses && shown.length === 0 && <tr className="empty"><td colSpan={9}>{search ? 'No courses match.' : 'No courses yet.'}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
