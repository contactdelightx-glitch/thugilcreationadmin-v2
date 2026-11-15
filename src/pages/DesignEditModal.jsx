import { useEffect, useState } from 'react';
import { fetchDesign, updateDesign } from '../api';
import { FORMS } from '../designForms';

export default function DesignEditModal({ target, categoryLabel, onClose, onSaved }) {
  const fields = FORMS[target.category];
  const [values, setValues] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchDesign(target.category, target.id)
      .then((d) => {
        if (cancelled) return;
        const v = {};
        fields.forEach((f) => { v[f.k] = d[f.k] ?? ''; });
        setValues({ ...v, _title: d.name || d.product_id });
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => { cancelled = true; };
  }, [target.category, target.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !saving && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saving, onClose]);

  const set = (k, v) => {
    setValues((x) => ({ ...x, [k]: v }));
    setFieldErrors((x) => ({ ...x, [k]: undefined }));
  };

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      const body = {};
      fields.forEach((f) => { body[f.k] = values[f.k]; });
      const saved = await updateDesign(target.category, target.id, body);
      onSaved(saved);
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.fields || {});
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={() => !saving && onClose()}>
      <form className="modal form-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>Edit design</h2>
        <p className="modal-user">{values ? values._title : '…'} · {categoryLabel}</p>

        {!values && !error && <p className="muted">Loading…</p>}
        {values && (
          <div className="form-grid">
            {fields.map((f) => (
              <label key={f.k} className={`field${f.full ? ' full' : ''}`}>
                <span>{f.label}{f.optional ? <em> (optional)</em> : null}</span>
                {f.select ? (
                  <select value={values[f.k]} onChange={(e) => set(f.k, e.target.value)}>
                    {f.select.map((o) => <option key={o} value={o}>{o[0].toUpperCase() + o.slice(1)}</option>)}
                  </select>
                ) : f.textarea ? (
                  <textarea rows={3} value={values[f.k]} onChange={(e) => set(f.k, e.target.value)} />
                ) : (
                  <input
                    type={f.type}
                    step={f.step}
                    min={f.min}
                    value={values[f.k]}
                    required={!f.optional}
                    onChange={(e) => set(f.k, e.target.value)}
                  />
                )}
                {fieldErrors[f.k] && <small className="field-error">{f.label} {fieldErrors[f.k]}</small>}
              </label>
            ))}
          </div>
        )}

        {error && <p className="modal-error">{error}</p>}

        <div className="modal-btns">
          <button type="button" className="btn" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="btn primary" disabled={saving || !values}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
