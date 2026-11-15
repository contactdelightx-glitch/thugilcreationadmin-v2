import { useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { fetchCourse, fetchCourseCurriculum } from '../api';
import { CourseWizard } from './AddCourse';

/** Loads the chosen course, then shows the course form filled in with it. */
export default function EditCourse({ onNavigate, params }) {
  const id = params?.id;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return undefined;
    let cancelled = false;
    setData(null);
    setError('');
    Promise.all([fetchCourse(id), fetchCourseCurriculum(id)])
      .then(([d, curriculum]) => !cancelled && setData({ ...d, curriculum }))
      .catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [id]);

  if (data) return <CourseWizard key={id} onNavigate={onNavigate} course={data} />;
  return (
    <div className="add-design add-course">
      <button type="button" className="back-link" onClick={() => onNavigate(id ? 'Course Details' : 'Courses', id ? { id } : null)}>
        <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={1.5} /> Back
      </button>
      {!id && <div className="notice">No course was chosen. Go back and pick one.</div>}
      {id && error && <div className="notice">Could not load the course: {error}</div>}
      {id && !error && <p className="muted">Loading course…</p>}
    </div>
  );
}
