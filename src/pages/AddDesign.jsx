import { useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, ArrowLeft01Icon } from '@hugeicons/core-free-icons';
import { createDesign, fetchDesigners } from '../api';
import ImageLibrary from '../components/ImageLibrary';
import FullSetPictures, { emptyPart } from '../components/FullSetPictures';
import { FORMS, CATEGORY_OPTIONS, CREATE_ONLY_FIELDS, emptyDesign } from '../designForms';

const cap = (s) => s[0].toUpperCase() + s.slice(1);

// which section each field belongs to
const PRICING = ['label', 'listing_rate', 'final_price'];
const BASICS = ['name', 'redirect_url', 'notes'];

function sectionsFor(category) {
  const fields = FORMS[category];
  const pick = (pred) => fields.filter(pred);
  return [
    {
      id: 'basics',
      title: category === 'free_image' ? 'Link' : 'Basic info',
      hint: category === 'free_image' ? 'Where this free image points to' : 'Name and any notes',
      fields: pick((f) => BASICS.includes(f.k)),
    },
    {
      id: 'specs',
      title: 'Specifications',
      hint: 'Loom and image details',
      fields: pick((f) => !BASICS.includes(f.k) && !PRICING.includes(f.k)),
    },
    { id: 'pricing', title: 'Label & pricing', hint: 'How the design is tagged and priced', fields: pick((f) => PRICING.includes(f.k)) },
    { id: 'media', title: 'Designer & images', hint: category === 'full_set' ? 'A Full Set has several pictures: add each part below' : 'Paste image links, or pick them from the library', fields: category === 'full_set' ? CREATE_ONLY_FIELDS.filter((f) => f.k === 'designer_email') : CREATE_ONLY_FIELDS },
  ].filter((s) => s.fields.length > 0);
}

const isWide = (f) => f.full || (f.select && f.select.length <= 3 && Math.max(...f.select.map((o) => o.length)) > 7);

function Field({ f, value, error, onChange, designers }) {
  const id = `add-${f.k}`;
  const optional = f.optional ? <em> (optional)</em> : null;

  let control;
  if (f.k === 'designer_email') {
    // pick from the registered designers instead of typing an email
    control = (
      <select id={id} value={value} required disabled={!designers || designers.length === 0} onChange={(e) => onChange(f.k, e.target.value)}>
        <option value="" disabled>
          {designers === null ? 'Loading designers…' : designers.length ? 'Select a designer' : 'No designers available'}
        </option>
        {(designers || []).map((d) => (
          <option key={d.id} value={d.email}>{d.email}{d.type === 'superadmin' ? ' (owner)' : ''}</option>
        ))}
      </select>
    );
  } else if (f.select && f.select.length <= 3) {
    // a short choice reads better as buttons than as a dropdown
    control = (
      <div className="chips" role="radiogroup" aria-label={f.label}>
        {f.select.map((o) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={value === o}
            className={value === o ? 'on' : ''}
            onClick={() => onChange(f.k, o)}
          >
            {cap(o)}
          </button>
        ))}
      </div>
    );
  } else if (f.select) {
    control = (
      <select id={id} value={value} onChange={(e) => onChange(f.k, e.target.value)}>
        {f.select.map((o) => <option key={o} value={o}>{cap(o)}</option>)}
      </select>
    );
  } else if (f.textarea) {
    control = <textarea id={id} rows={3} value={value} onChange={(e) => onChange(f.k, e.target.value)} />;
  } else {
    const input = (
      <input
        id={id}
        type={f.type}
        step={f.step}
        min={f.min}
        value={value}
        required={!f.optional}
        onChange={(e) => onChange(f.k, e.target.value)}
      />
    );
    control = f.step === '0.01' ? <div className="affix"><span>₹</span>{input}</div> : input;
  }

  return (
    <div className={`field${isWide(f) ? ' full' : ''}${error ? ' has-error' : ''}`}>
      {f.select && f.select.length <= 3 ? (
        <span className="field-label">{f.label}{optional}</span>
      ) : (
        <label htmlFor={id}>{f.label}{optional}</label>
      )}
      {control}
      {error && <small className="field-error">{f.label} {error}</small>}
    </div>
  );
}

export default function AddDesign({ onNavigate }) {
  const [category, setCategory] = useState('butta');
  const [values, setValues] = useState(() => emptyDesign('butta'));
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);
  const [parts, setParts] = useState(() => [emptyPart()]); // the pictures of a Full Set
  const [designers, setDesigners] = useState(null); // null while loading
  const [designersError, setDesignersError] = useState('');

  useEffect(() => {
    fetchDesigners({ status: 'active' })
      .then((r) => setDesigners(r.data))
      .catch((e) => { setDesigners([]); setDesignersError(e.message); });
  }, []);

  const sections = sectionsFor(category);
  const categoryLabel = CATEGORY_OPTIONS.find((c) => c.key === category).label;

  const listing = Number(values.listing_rate);
  const final = Number(values.final_price);
  const discount = listing > final && final >= 0 && values.final_price !== '' ? Math.round(((listing - final) / listing) * 100) : 0;

  function pickCategory(key) {
    if (key === category) return;
    // switching category starts a fresh form, but keeps the designer and image links
    const keep = {};
    CREATE_ONLY_FIELDS.forEach((f) => { keep[f.k] = values[f.k]; });
    setCategory(key);
    setParts([emptyPart()]);
    setValues({ ...emptyDesign(key), ...keep });
    setFieldErrors({});
    setError('');
    setCreated(null);
  }

  // clicking an image in the library: a Full Set puts it into the next empty part
  const fillFromLibrary = (k, url) => {
    if (category !== 'full_set') return set(k, url);
    const field = k === 'original_image_url' ? 'original' : 'image';
    setParts((list) => {
      const at = list.findIndex((p) => !p[field]);
      if (at >= 0) return list.map((p, i) => (i === at ? { ...p, [field]: url } : p));
      return list.length >= 20 ? list : [...list, { ...emptyPart(), [field]: url }];
    });
    setFieldErrors((x) => ({ ...x, image_url: undefined, original_image_url: undefined }));
  };

  const set = (k, v) => {
    setValues((x) => ({ ...x, [k]: v }));
    setFieldErrors((x) => ({ ...x, [k]: undefined }));
  };

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setFieldErrors({});
    setCreated(null);
    try {
      let body = values;
      if (category === 'full_set') {
        const used = parts.filter((p) => p.image.trim() || p.original.trim());
        const half = used.findIndex((p) => !p.image.trim() || !p.original.trim());
        if (!used.length) { setFieldErrors({ image_url: 'Add at least one picture' }); setSaving(false); return; }
        if (half >= 0) { setFieldErrors({ image_url: `Picture ${half + 1} needs both a preview and an original` }); setSaving(false); return; }
        body = { ...values, image_url: used.map((p) => p.image.trim()).join(' '), original_image_url: used.map((p) => p.original.trim()).join(' ') };
      }
      const saved = await createDesign(category, body);
      setCreated(saved);
      // ready for the next one: keep category and designer, clear the rest
      setValues({ ...emptyDesign(category), designer_email: values.designer_email });
      setParts([emptyPart()]);
      document.querySelector('.content')?.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.fields || {});
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="add-design">
      <button type="button" className="back-link" onClick={() => onNavigate('Designs')}>
        <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={1.5} /> Back to designs
      </button>

      {created && (
        <div className="success">
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={20} strokeWidth={1.5} />
          <span>
            {categoryLabel} design <strong>{created.name || 'Free image'}</strong> was created.
          </span>
          <button className="btn" onClick={() => onNavigate('Designs')}>View designs</button>
        </div>
      )}

      <div className="add-intro">
        <h2>New design</h2>
        <div className="cat-tabs" role="tablist" aria-label="Category">
          {CATEGORY_OPTIONS.map((c) => (
            <button key={c.key} type="button" role="tab" aria-selected={category === c.key} className={category === c.key ? 'on' : ''} onClick={() => pickCategory(c.key)}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="add-layout">
        <form className="add-form" onSubmit={submit}>
          {sections.map((s) => (
            <section key={s.id} className="panel">
              <header className="panel-head">
                <h3>{s.title}</h3>
                <p>{s.hint}</p>
              </header>
              <div className={`form-grid${s.id === 'specs' || s.id === 'pricing' ? ' cols-3' : ''}`}>
                {s.fields.map((f) => (
                  <Field key={f.k} f={f} value={values[f.k]} error={fieldErrors[f.k] || (f.k === 'designer_email' && designersError ? `list could not be loaded: ${designersError}` : undefined)} onChange={set} designers={designers} />
                ))}
              </div>
              {s.id === 'media' && category === 'full_set' && (
                <FullSetPictures parts={parts} onChange={(p) => { setParts(p); setFieldErrors((x) => ({ ...x, image_url: undefined, original_image_url: undefined })); }} error={fieldErrors.image_url || fieldErrors.original_image_url} />
              )}
              {s.id === 'pricing' && discount > 0 && (
                <p className="panel-note">Shown to customers as ₹{final.toLocaleString('en-IN')} with ₹{listing.toLocaleString('en-IN')} struck through — {discount}% off.</p>
              )}
            </section>
          ))}

          {error && <p className="modal-error">{error}</p>}

          <div className="add-actions">
            <button type="button" className="btn" disabled={saving} onClick={() => { setValues(emptyDesign(category)); setParts([emptyPart()]); setFieldErrors({}); setError(''); }}>
              Clear form
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? 'Creating…' : `Create ${categoryLabel} design`}
            </button>
          </div>
        </form>

        <aside className="add-library">
          <ImageLibrary onFill={fillFromLibrary} />
        </aside>
      </div>
    </div>
  );
}
