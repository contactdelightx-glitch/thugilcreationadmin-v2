import { useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { fetchCourse } from '../api';
import { CourseTabs, Published, money, longDuration, fmtDate } from '../components/CourseParts';

export default function CourseDetail({ onNavigate, params }) {
  const id = params?.id;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    setData(null);
    setError('');
    fetchCourse(id)
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [id]);

  const back = (
    <button type="button" className="back-link" onClick={() => onNavigate('Courses')}>
      <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={1.5} /> Back to courses
    </button>
  );

  if (!id) {
    return <div className="course-detail">{back}<div className="notice">No course was chosen. Go back and pick one.</div></div>;
  }
  if (error) return <div className="course-detail">{back}<div className="notice">Could not load the course: {error}</div></div>;
  if (!data) return <div className="course-detail">{back}<p className="muted">Loading course…</p></div>;

  const c = data.course;
  return (
    <div className="course-detail">
      {back}

      {params?.created && (
        <div className="success">
          <span>
            <strong>{c.title}</strong> was created as {c.is_published ? 'a published course' : 'a draft'}. {c.sections ? `It has ${c.sections} ${c.sections === 1 ? 'section' : 'sections'} and no videos yet.` : 'It has no sections or videos yet.'}
          </span>
          <button className="btn" onClick={() => onNavigate('Courses')}>All courses</button>
        </div>
      )}

      <header className="course-head">
        <div className="course-head-text">
          <h2>{c.title}</h2>
          <p className="muted">
            {[c.category, c.language, c.instructor_name && `by ${c.instructor_name}`].filter(Boolean).join(' · ')}
            {' · '}Updated {fmtDate(c.updated_at)}
          </p>
        </div>
        <Published on={c.is_published} />
      </header>

      {c.description && <p className="course-desc">{c.description}</p>}

      <div className="stats">
        <div className="kpi">
          <span className="stat-label">Price</span>
          <strong className="stat-value">{money(c.price)}</strong>
          <span className="stat-hint">{c.certificate_with_price != null ? `${money(c.certificate_with_price)} with certificate` : 'No certificate option'}</span>
        </div>
        <div className="kpi">
          <span className="stat-label">Content</span>
          <strong className="stat-value">{c.duration || (c.duration_seconds ? longDuration(c.duration_seconds) : '—')}</strong>
          <span className="stat-hint">{c.sections} sections · {c.videos} videos · {c.resources} files</span>
        </div>
        <div className="kpi">
          <span className="stat-label">Students</span>
          <strong className="stat-value">{c.students}</strong>
          <span className="stat-hint">{money(c.revenue)} earned</span>
        </div>
        <div className="kpi">
          <span className="stat-label">Rating</span>
          <strong className="stat-value">{c.review_count ? `${c.avg_rating.toFixed(1)} ★` : '—'}</strong>
          <span className="stat-hint">{c.review_count ? `${c.review_count} reviews` : 'No reviews yet'}</span>
        </div>
      </div>

      <CourseTabs data={data} />
    </div>
  );
}
