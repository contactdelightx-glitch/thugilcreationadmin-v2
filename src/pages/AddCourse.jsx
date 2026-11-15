import { useEffect, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon, ArrowRight01Icon, Cancel01Icon, AddSquareIcon, File01Icon, InformationCircleIcon, BookOpen01Icon,
  Download04Icon, Image01Icon, CheckmarkCircle02Icon, Tick02Icon, ArrowUp01Icon, ArrowDown01Icon, Upload04Icon, Idea01Icon,
} from '@hugeicons/core-free-icons';
import { createCourse, fetchCourseCategories, uploadCourseThumbnail } from '../api';

const STEPS = [
  { key: 'basics', title: 'Course Basics', sub: 'Define course title and description', icon: File01Icon },
  { key: 'details', title: 'Course Details', sub: 'Language, access and pricing', icon: InformationCircleIcon },
  { key: 'curriculum', title: 'Curriculum', sub: 'Add the course sections', icon: BookOpen01Icon },
  { key: 'software', title: 'Software', sub: 'Add required software links', icon: Download04Icon },
  { key: 'media', title: 'Media', sub: 'Upload thumbnail', icon: Image01Icon },
  { key: 'review', title: 'Review', sub: 'Review and publish course', icon: CheckmarkCircle02Icon },
];
// which step shows each server-side field, so an error can send the admin back to it
const STEP_OF = {
  title: 0, description: 0, learning_points: 0, category_id: 0, new_category: 0,
  instructor_name: 1, language: 1, price: 1, certificate_with_price: 1, access_months: 1,
  sections: 2, software: 3, thumbnail_url: 4, status: 5,
};
const TIPS = ['Clear sections', 'Engaging titles', 'Practice materials', 'Required software', 'Fair pricing'];
const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi', 'Bengali', 'Gujarati'];
const PLATFORMS = ['', 'multi-platform', 'windows', 'mac', 'linux'];
const NEW_CATEGORY = '__new__';
const MAX = { title: 75, description: 1000, point: 500, points: 20, section: 200, sectionDesc: 2000, softwareName: 200, steps: 5000 };
const THUMB_MB = 5;
const THUMB_TYPES = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const isUrl = (v) => /^https?:\/\//i.test(v.trim());

const initial = () => ({
  title: '', description: '', learning_points: [''], category: '', new_category: '',
  instructor_name: '', language: 'English', access_months: '', price: '', offer_certificate: false, certificate_with_price: '',
  sections: [], software: [], thumbnail_url: '', status: 'draft',
});

function Counter({ value, max }) {
  return <span className={`counter${value.length >= max * 0.9 ? ' near' : ''}`}>{value.length}/{max}</span>;
}

function Group({ label, hint, error, counter, action, children }) {
  return (
    <div className={`group${error ? ' has-error' : ''}`}>
      <div className="group-head"><span className="group-label">{label}</span>{action}</div>
      {children}
      <div className="group-foot">
        <span className={error ? 'field-error' : 'field-hint'}>{error ? `${label.replace(/ \*$/, '')} ${error}` : hint}</span>
        {counter}
      </div>
    </div>
  );
}

// what must be right before moving on from a step (the server checks everything again on save)
function validate(i, v) {
  const e = {};
  const num = (x) => (x === '' ? null : Number(x));
  if (i === 0) {
    if (!v.title.trim()) e.title = 'is required';
    if (!v.description.trim()) e.description = 'is required';
    const points = v.learning_points.map((p) => p.trim()).filter(Boolean);
    if (!points.length) e.learning_points = 'needs at least one point';
    if (v.category === NEW_CATEGORY && !v.new_category.trim()) e.new_category = 'is required';
  }
  if (i === 1) {
    if (!v.instructor_name.trim()) e.instructor_name = 'is required';
    const price = num(v.price);
    if (price == null) e.price = 'is required';
    else if (!Number.isFinite(price) || price < 0) e.price = 'must be a number of 0 or more';
    if (v.offer_certificate) {
      const c = num(v.certificate_with_price);
      if (c == null) e.certificate_with_price = 'is required when a certificate is offered';
      else if (!Number.isFinite(c) || c < 0) e.certificate_with_price = 'must be a number of 0 or more';
      else if (price != null && c < price) e.certificate_with_price = 'must be at least the course price';
    }
    const m = num(v.access_months);
    if (m != null && (!Number.isInteger(m) || m < 1 || m > 120)) e.access_months = 'must be a whole number from 1 to 120';
  }
  if (i === 2) {
    const bad = v.sections.findIndex((s) => (s.title.trim() || s.description.trim()) && !s.title.trim());
    if (bad >= 0) e.sections = `section ${bad + 1} needs a title`;
  }
  if (i === 3) {
    const bad = v.software.findIndex((s) => (s.name.trim() || s.download_url.trim() || s.description.trim()) && (!s.name.trim() || !isUrl(s.download_url)));
    if (bad >= 0) e.software = `item ${bad + 1} needs a name and a link starting with http:// or https://`;
  }
  if (i === 4 && v.thumbnail_url.trim() && !isUrl(v.thumbnail_url)) e.thumbnail_url = 'must be a link starting with http:// or https://';
  return e;
}

export default function AddCourse({ onNavigate }) {
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState(null); // null while loading
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef(null);

  useEffect(() => { fetchCourseCategories().then(setCategories).catch(() => setCategories([])); }, []);

  const set = (k, v) => {
    setValues((x) => ({ ...x, [k]: v }));
    setErrors((x) => ({ ...x, [k]: undefined }));
  };
  const setList = (k, fn) => set(k, fn(values[k]));
  const toTop = () => document.querySelector('.content')?.scrollTo({ top: 0, behavior: 'smooth' });

  function goTo(target) {
    if (target <= step) { setStep(target); return toTop(); }
    // moving forward: every step on the way must be valid
    for (let i = step; i < target; i++) {
      const e = validate(i, values);
      if (Object.keys(e).length) { setErrors(e); setStep(i); toTop(); return; }
    }
    setErrors({});
    setStep(target);
    setReached((r) => Math.max(r, target));
    toTop();
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (step < STEPS.length - 1) return goTo(step + 1);

    // last step: re-check everything, then save
    for (let i = 0; i < STEPS.length - 1; i++) {
      const errs = validate(i, values);
      if (Object.keys(errs).length) { setErrors(errs); setStep(i); toTop(); return; }
    }
    setSaving(true);
    setSaveError('');
    const isNew = values.category === NEW_CATEGORY;
    const body = {
      title: values.title, description: values.description, instructor_name: values.instructor_name, language: values.language,
      price: values.price, access_months: values.access_months, status: values.status, thumbnail_url: values.thumbnail_url,
      certificate_with_price: values.offer_certificate ? values.certificate_with_price : '',
      learning_points: values.learning_points.map((p) => p.trim()).filter(Boolean),
      sections: values.sections.map((s) => ({ title: s.title, description: s.description })),
      software: values.software,
      ...(isNew ? { new_category: values.new_category } : values.category ? { category_id: Number(values.category) } : {}),
    };
    try {
      const course = await createCourse(body);
      onNavigate('Course Details', { id: course.id, created: true });
    } catch (err) {
      const fields = err.fields || {};
      const keys = Object.keys(fields);
      setSaving(false);
      if (keys.length) {
        setErrors(fields);
        setStep(Math.min(...keys.map((k) => STEP_OF[k] ?? 0)));
        toTop();
      } else {
        setSaveError(err.message);
      }
    }
  }

  async function upload(file) {
    if (!file) return;
    setUploadError('');
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!THUMB_TYPES.includes(ext)) return setUploadError('Use a jpg, png, gif or webp image');
    if (file.size > THUMB_MB * 1024 * 1024) return setUploadError(`The image must be smaller than ${THUMB_MB} MB`);
    setUploading(true);
    try {
      set('thumbnail_url', await uploadCourseThumbnail(file));
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  const progress = Math.round(((step + 1) / STEPS.length) * 100);
  const cur = STEPS[step];
  const moveRow = (k, i, by) => setList(k, (list) => { const next = [...list]; [next[i], next[i + by]] = [next[i + by], next[i]]; return next; });
  const category = categories?.find((c) => String(c.id) === values.category);
  const certExtra = values.offer_certificate && values.price && values.certificate_with_price
    ? `Certificate adds ₹${Math.max(Number(values.certificate_with_price) - Number(values.price), 0).toLocaleString('en-IN')}` : '';
  const filledPoints = values.learning_points.map((p) => p.trim()).filter(Boolean);
  const filledSections = values.sections.filter((s) => s.title.trim());
  const filledSoftware = values.software.filter((s) => s.name.trim());

  return (
    <div className="add-design add-course">
      <button type="button" className="back-link" onClick={() => onNavigate('Courses')}>
        <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={1.5} /> Back to courses
      </button>

      <div className="add-intro">
        <h2>Create Course</h2>
        <p className="muted add-sub">Build and launch your online course</p>
      </div>

      <div className="wizard">
        <aside className="wizard-side">
          <div className="side-card">
            <div className="progress-head"><span>Progress</span><strong>{progress}%</strong></div>
            <div className="progress-bar"><span style={{ width: `${progress}%` }} /></div>
            <div className="step-now">Step {step + 1} of {STEPS.length} · {cur.title}</div>

            <ol className="step-list">
              {STEPS.map((s, i) => {
                const done = i < step || (i <= reached && i !== step && i < step);
                const state = i === step ? 'active' : i < step ? 'done' : 'todo';
                return (
                  <li key={s.key}>
                    <button type="button" className={`step-item ${state}`} onClick={() => goTo(i)} aria-current={i === step ? 'step' : undefined} disabled={saving}>
                      <span className="step-icon"><HugeiconsIcon icon={done ? Tick02Icon : s.icon} size={18} strokeWidth={1.5} /></span>
                      <span className="step-text"><strong>{s.title}</strong><small>{s.sub}</small></span>
                      {i === step && <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.5} />}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="tips">
            <h4><HugeiconsIcon icon={Idea01Icon} size={16} strokeWidth={1.5} /> Course Tips</h4>
            <ul>{TIPS.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
        </aside>

        <form className="wizard-main" onSubmit={onSubmit} noValidate>
          <div className="wizard-head">
            <h3>{cur.title}</h3>
            <p>{cur.sub}</p>
          </div>

          {step === 0 && (
            <>
              <Group label="Course Title *" hint="Clear and compelling title to attract students" error={errors.title} counter={<Counter value={values.title} max={MAX.title} />}>
                <input type="text" autoFocus maxLength={MAX.title} placeholder="e.g. Start-up Saree Designing Course" value={values.title} onChange={(e) => set('title', e.target.value)} />
              </Group>

              <Group label="Course Description *" hint={`Detailed description (max ${MAX.description} chars)`} error={errors.description} counter={<Counter value={values.description} max={MAX.description} />}>
                <textarea rows={5} maxLength={MAX.description} placeholder="Describe what students will learn in your course…" value={values.description} onChange={(e) => set('description', e.target.value)} />
              </Group>

              <Group
                label="What will the student learn? *"
                hint={`Up to ${MAX.points} points, ${MAX.point} characters each`}
                error={errors.learning_points}
                action={
                  <button type="button" className="link-btn" onClick={() => values.learning_points.length < MAX.points && setList('learning_points', (l) => [...l, ''])} disabled={values.learning_points.length >= MAX.points}>
                    + Add Point
                  </button>
                }
              >
                <div className="points">
                  {values.learning_points.map((p, i) => (
                    <div key={i} className="point-block">
                      <div className="point-row">
                        <span className="point-num">{i + 1}</span>
                        <textarea rows={2} maxLength={MAX.point} placeholder="e.g. How to create punching plans for jacquards" aria-label={`Learning point ${i + 1}`}
                          value={p} onChange={(e) => setList('learning_points', (l) => l.map((x, j) => (j === i ? e.target.value : x)))} />
                        <button type="button" className="icon-btn" aria-label={`Remove point ${i + 1}`}
                          onClick={() => setList('learning_points', (l) => (l.length > 1 ? l.filter((_, j) => j !== i) : ['']))}>
                          <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.5} />
                        </button>
                      </div>
                      <Counter value={p} max={MAX.point} />
                    </div>
                  ))}
                </div>
              </Group>

              <Group label="Course Category" hint="Choose the most relevant category for your course" error={errors.category_id || errors.new_category}>
                <select value={values.category} disabled={categories === null} onChange={(e) => set('category', e.target.value)}>
                  <option value="">{categories === null ? 'Loading…' : 'Select a category'}</option>
                  {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  <option value={NEW_CATEGORY}>＋ Create a new category…</option>
                </select>
                {values.category === NEW_CATEGORY && (
                  <input className="stacked" type="text" maxLength={100} placeholder="New category name" aria-label="New category name" value={values.new_category} onChange={(e) => set('new_category', e.target.value)} />
                )}
              </Group>
            </>
          )}

          {step === 1 && (
            <>
              <div className="two-col">
                <Group label="Instructor *" hint="Who teaches this course" error={errors.instructor_name}>
                  <input type="text" autoFocus maxLength={100} value={values.instructor_name} onChange={(e) => set('instructor_name', e.target.value)} />
                </Group>
                <Group label="Language" hint="Language the course is taught in" error={errors.language}>
                  <input type="text" list="course-languages" maxLength={50} value={values.language} onChange={(e) => set('language', e.target.value)} />
                  <datalist id="course-languages">{LANGUAGES.map((l) => <option key={l} value={l} />)}</datalist>
                </Group>
              </div>

              <div className="two-col">
                <Group label="Course Price *" hint="What a student pays for the course" error={errors.price}>
                  <div className="affix"><span>₹</span><input type="number" min="0" step="1" value={values.price} onChange={(e) => set('price', e.target.value)} /></div>
                </Group>
                <Group label="Access Period" hint="How many months a student keeps access (optional)" error={errors.access_months}>
                  <input type="number" min="1" max="120" step="1" placeholder="e.g. 6" value={values.access_months} onChange={(e) => set('access_months', e.target.value)} />
                </Group>
              </div>

              <Group label="Certificate" hint={certExtra || 'Students can buy a certificate along with the course'} error={errors.certificate_with_price}>
                <div className="chips" role="radiogroup" aria-label="Certificate option">
                  {[[false, 'No certificate'], [true, 'Offer a certificate']].map(([v, label]) => (
                    <button key={label} type="button" role="radio" aria-checked={values.offer_certificate === v} className={values.offer_certificate === v ? 'on' : ''} onClick={() => set('offer_certificate', v)}>{label}</button>
                  ))}
                </div>
                {values.offer_certificate && (
                  <div className="affix stacked"><span>₹</span><input type="number" min="0" step="1" placeholder="Price with certificate" aria-label="Price with certificate" value={values.certificate_with_price} onChange={(e) => set('certificate_with_price', e.target.value)} /></div>
                )}
              </Group>
            </>
          )}

          {step === 2 && (
            <>
              <div className="note">Videos can’t be uploaded from here yet. Add the sections now and put videos into them after the course is created.</div>
              <Group label="Sections" hint={`${filledSections.length} section${filledSections.length === 1 ? '' : 's'} — they appear in this order`} error={errors.sections}
                action={<button type="button" className="link-btn" onClick={() => setList('sections', (l) => [...l, { title: '', description: '' }])}>+ Add Section</button>}>
                {values.sections.length === 0 && <p className="empty-line">No sections yet. You can skip this and add them later.</p>}
                <div className="rows">
                  {values.sections.map((s, i) => (
                    <div key={i} className="row-card">
                      <span className="point-num">{i + 1}</span>
                      <div className="row-fields">
                        <input type="text" maxLength={MAX.section} placeholder="Section title" aria-label={`Section ${i + 1} title`} value={s.title}
                          onChange={(e) => setList('sections', (l) => l.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                        <input type="text" maxLength={MAX.sectionDesc} placeholder="Short description (optional)" aria-label={`Section ${i + 1} description`} value={s.description}
                          onChange={(e) => setList('sections', (l) => l.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
                      </div>
                      <div className="row-actions-col">
                        <button type="button" className="icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => moveRow('sections', i, -1)}><HugeiconsIcon icon={ArrowUp01Icon} size={16} strokeWidth={1.5} /></button>
                        <button type="button" className="icon-btn" aria-label="Move down" disabled={i === values.sections.length - 1} onClick={() => moveRow('sections', i, 1)}><HugeiconsIcon icon={ArrowDown01Icon} size={16} strokeWidth={1.5} /></button>
                        <button type="button" className="icon-btn" aria-label={`Remove section ${i + 1}`} onClick={() => setList('sections', (l) => l.filter((_, j) => j !== i))}><HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.5} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </Group>
            </>
          )}

          {step === 3 && (
            <Group label="Required software" hint={`${filledSoftware.length} item${filledSoftware.length === 1 ? '' : 's'} — students get these download links with the course`} error={errors.software}
              action={<button type="button" className="link-btn" onClick={() => setList('software', (l) => [...l, { name: '', download_url: '', platform: '', is_required: true, description: '' }])}>+ Add Software</button>}>
              {values.software.length === 0 && <p className="empty-line">No software yet. You can skip this and add it later.</p>}
              <div className="rows">
                {values.software.map((s, i) => {
                  const upd = (patch) => setList('software', (l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                  return (
                    <div key={i} className="row-card column">
                      <div className="row-top">
                        <span className="point-num">{i + 1}</span>
                        <input type="text" maxLength={MAX.softwareName} placeholder="Software name" aria-label={`Software ${i + 1} name`} value={s.name} onChange={(e) => upd({ name: e.target.value })} />
                        <button type="button" className="icon-btn" aria-label={`Remove software ${i + 1}`} onClick={() => setList('software', (l) => l.filter((_, j) => j !== i))}><HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.5} /></button>
                      </div>
                      <div className="two-col tight">
                        <input type="url" placeholder="Download link (https://…)" aria-label={`Software ${i + 1} link`} value={s.download_url} onChange={(e) => upd({ download_url: e.target.value })} />
                        <select aria-label={`Software ${i + 1} platform`} value={s.platform} onChange={(e) => upd({ platform: e.target.value })}>
                          {PLATFORMS.map((p) => <option key={p} value={p}>{p ? p : 'Platform (optional)'}</option>)}
                        </select>
                      </div>
                      <textarea rows={2} maxLength={MAX.steps} placeholder="Installation steps (optional)" aria-label={`Software ${i + 1} steps`} value={s.description} onChange={(e) => upd({ description: e.target.value })} />
                      <label className="check"><input type="checkbox" checked={s.is_required} onChange={(e) => upd({ is_required: e.target.checked })} /> Students need this to follow the course</label>
                    </div>
                  );
                })}
              </div>
            </Group>
          )}

          {step === 4 && (
            <>
              <Group label="Thumbnail" hint={`jpg, png, gif or webp, up to ${THUMB_MB} MB`} error={errors.thumbnail_url}>
                {values.thumbnail_url && isUrl(values.thumbnail_url) ? (
                  <div className="thumb-box">
                    <img src={values.thumbnail_url} alt="Course thumbnail" />
                    <div className="thumb-info">
                      <span className="mono">{values.thumbnail_url.length > 70 ? `${values.thumbnail_url.slice(0, 67)}…` : values.thumbnail_url}</span>
                      <button type="button" className="btn" onClick={() => set('thumbnail_url', '')}>Remove</button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`dropzone small${dragging ? ' drag' : ''}${uploading ? ' busy' : ''}`}
                    role="button" tabIndex={0}
                    onClick={() => !uploading && fileInput.current?.click()}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), !uploading && fileInput.current?.click())}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setDragging(false); upload(e.dataTransfer.files[0]); }}
                  >
                    <HugeiconsIcon icon={Upload04Icon} size={28} strokeWidth={1.5} />
                    <strong>{uploading ? 'Uploading…' : 'Drop an image here, or click to browse'}</strong>
                    <span>This is the picture students see for the course</span>
                  </div>
                )}
                <input ref={fileInput} type="file" hidden accept=".jpg,.jpeg,.png,.gif,.webp,image/*" onChange={(e) => upload(e.target.files[0])} />
                {uploadError && <p className="field-error up-error">{uploadError}</p>}
              </Group>
              <Group label="Or paste an image link" hint="Optional" error={undefined}>
                <input type="url" placeholder="https://…" value={values.thumbnail_url} onChange={(e) => set('thumbnail_url', e.target.value)} />
              </Group>
            </>
          )}

          {step === 5 && (
            <>
              <Review title="Course" onEdit={() => goTo(0)} rows={[
                ['Title', values.title],
                ['Description', values.description.length > 160 ? `${values.description.slice(0, 157)}…` : values.description],
                ['Category', values.category === NEW_CATEGORY ? `${values.new_category} (new)` : category ? category.name : '—'],
                ['Learning points', `${filledPoints.length}`],
              ]} />
              <Review title="Details & pricing" onEdit={() => goTo(1)} rows={[
                ['Instructor', values.instructor_name],
                ['Language', values.language || '—'],
                ['Access period', values.access_months ? `${values.access_months} months` : 'Not set'],
                ['Course price', `₹${Number(values.price || 0).toLocaleString('en-IN')}`],
                ['Certificate', values.offer_certificate ? `Offered — ₹${Number(values.certificate_with_price || 0).toLocaleString('en-IN')} with certificate` : 'Not offered'],
              ]} />
              <Review title="Content" onEdit={() => goTo(2)} rows={[
                ['Sections', filledSections.length ? filledSections.map((s) => s.title.trim()).join(' · ') : 'None yet'],
                ['Software', filledSoftware.length ? filledSoftware.map((s) => s.name.trim()).join(' · ') : 'None yet'],
              ]} />
              <Review title="Media" onEdit={() => goTo(4)} rows={[['Thumbnail', values.thumbnail_url ? <img key="t" className="review-thumb" src={values.thumbnail_url} alt="Thumbnail" /> : 'None']]} />

              <Group label="Publishing" hint={values.status === 'draft' ? 'Draft courses are hidden from students. Publish it later, once it has content.' : 'Students can see and buy this course straight away.'} error={errors.status}>
                <div className="chips" role="radiogroup" aria-label="Status">
                  {[['draft', 'Save as draft'], ['published', 'Publish now']].map(([v, label]) => (
                    <button key={v} type="button" role="radio" aria-checked={values.status === v} className={values.status === v ? 'on' : ''} onClick={() => set('status', v)}>{label}</button>
                  ))}
                </div>
              </Group>
              {saveError && <p className="modal-error">{saveError}</p>}
            </>
          )}

          <div className="wizard-actions">
            <button type="button" className="btn with-icon" onClick={() => onNavigate('Courses')} disabled={saving}>
              <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.5} /> Cancel
            </button>
            <div className="wizard-nav">
              {step > 0 && <button type="button" className="btn with-icon" onClick={() => goTo(step - 1)} disabled={saving}><HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={1.5} /> Back</button>}
              <button type="submit" className="btn primary with-icon" disabled={saving || uploading}>
                {step < STEPS.length - 1 ? <>Continue <HugeiconsIcon icon={ArrowRight01Icon} size={16} strokeWidth={1.5} /></> : saving ? 'Creating…' : (values.status === 'published' ? 'Create & publish' : 'Create course')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// a small table on the Review step, with a shortcut back to the step that owns it
function Review({ title, rows, onEdit }) {
  return (
    <div className="review">
      <div className="review-head"><h4>{title}</h4><button type="button" className="link-btn" onClick={onEdit}>Edit</button></div>
      <table className="review-table">
        <tbody>{rows.map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
