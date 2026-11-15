import { useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Upload04Icon, ArrowUp01Icon, ArrowDown01Icon, Cancel01Icon, Add01Icon } from '@hugeicons/core-free-icons';
import { uploadImage } from '../api';

export const MAX_PARTS = 20;
export const emptyPart = () => ({ key: Math.random().toString(36).slice(2), image: '', original: '' });

/**
 * A Full Set is several pictures (body, border, pallu ...). Each part has a preview picture and its original file.
 * parts: [{ key, image, original }]  ·  onChange(newParts)
 * Each picture can be pasted as a link, picked from the library on the right, or uploaded (several files at once fill
 * the next parts one after another).
 */
export default function FullSetPictures({ parts, onChange, error }) {
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const fileRef = useRef(null);
  const target = useRef({ field: 'image', index: 0 });

  const patch = (i, field, value) => onChange(parts.map((p, j) => (j === i ? { ...p, [field]: value } : p)));
  const move = (i, by) => { const l = [...parts]; [l[i], l[i + by]] = [l[i + by], l[i]]; onChange(l); };
  const remove = (i) => onChange(parts.length === 1 ? [emptyPart()] : parts.filter((_, j) => j !== i));

  function pick(field, index) {
    target.current = { field, index };
    fileRef.current.value = '';
    fileRef.current.click();
  }

  async function onFiles(e) {
    const files = [...e.target.files];
    if (!files.length) return;
    const { field, index } = target.current;
    setNote('');
    const next = parts.map((p) => ({ ...p }));
    while (next.length < index + files.length && next.length < MAX_PARTS) next.push(emptyPart());
    let done = 0;
    try {
      for (const [n, file] of files.entries()) {
        if (index + n >= MAX_PARTS) break;
        setBusy(`Uploading ${n + 1} of ${files.length}…`);
        const up = await uploadImage(file);
        next[index + n][field] = up.url;
        done += 1;
        onChange(next.map((p) => ({ ...p })));
      }
      setNote(`${done} ${done === 1 ? 'file' : 'files'} uploaded`);
    } catch (err) {
      setNote(`${err.message}${done ? ` (${done} uploaded before it stopped)` : ''}`);
    } finally { setBusy(''); }
  }

  return (
    <div className={`fsp${error ? ' has-error' : ''}`}>
      <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />
      <div className="fsp-head">
        <span className="field-label">Pictures <em>({parts.length} of {MAX_PARTS})</em></span>
        <span className="muted">Preview = the picture shoppers see. Original = the full file they download.</span>
      </div>

      <ol className="fsp-list">
        {parts.map((p, i) => (
          <li key={p.key} className="fsp-row">
            <span className="fsp-no">{i + 1}</span>
            <div className="fsp-fields">
              {[['image', 'Preview picture link'], ['original', 'Original file link']].map(([field, label]) => (
                <div key={field} className="fsp-field">
                  <input type="url" placeholder={label} aria-label={`Picture ${i + 1}: ${label}`} value={p[field]} onChange={(e) => patch(i, field, e.target.value.trim())} />
                  <button type="button" className="icon-btn" disabled={Boolean(busy)} title="Upload one or more files" aria-label={`Upload ${label.toLowerCase()} for picture ${i + 1}`} onClick={() => pick(field, i)}>
                    <HugeiconsIcon icon={Upload04Icon} size={16} strokeWidth={1.6} />
                  </button>
                </div>
              ))}
            </div>
            {p.image && <img className="fsp-thumb" src={p.image} alt="" referrerPolicy="no-referrer" />}
            <span className="fsp-actions">
              <button type="button" className="icon-btn" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><HugeiconsIcon icon={ArrowUp01Icon} size={16} strokeWidth={1.5} /></button>
              <button type="button" className="icon-btn" aria-label="Move down" disabled={i === parts.length - 1} onClick={() => move(i, 1)}><HugeiconsIcon icon={ArrowDown01Icon} size={16} strokeWidth={1.5} /></button>
              <button type="button" className="icon-btn" aria-label={`Remove picture ${i + 1}`} onClick={() => remove(i)}><HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.5} /></button>
            </span>
          </li>
        ))}
      </ol>

      <div className="fsp-foot">
        <button type="button" className="link-btn" disabled={parts.length >= MAX_PARTS} onClick={() => onChange([...parts, emptyPart()])}>
          <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.6} /> Add picture
        </button>
        <button type="button" className="link-btn" disabled={Boolean(busy) || parts.length >= MAX_PARTS} onClick={() => pick('image', parts.findIndex((p) => !p.image) < 0 ? parts.length : parts.findIndex((p) => !p.image))}>
          <HugeiconsIcon icon={Upload04Icon} size={16} strokeWidth={1.6} /> Upload several previews
        </button>
        <button type="button" className="link-btn" disabled={Boolean(busy) || parts.length >= MAX_PARTS} onClick={() => pick('original', parts.findIndex((p) => !p.original) < 0 ? parts.length : parts.findIndex((p) => !p.original))}>
          <HugeiconsIcon icon={Upload04Icon} size={16} strokeWidth={1.6} /> Upload several originals
        </button>
        <span className="muted" role="status">{busy || note}</span>
      </div>
      {error && <small className="field-error">{error}</small>}
    </div>
  );
}
