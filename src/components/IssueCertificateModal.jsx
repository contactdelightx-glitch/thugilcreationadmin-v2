import { useEffect, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Upload04Icon, File02Icon, Cancel01Icon } from '@hugeicons/core-free-icons';
import { issueCertificate } from '../api';

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp';
const MAX_MB = 10;
const size = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/**
 * The instructor approves a certificate request by choosing the finished certificate file on their device.
 * `replace`: the certificate was issued before, this swaps its file.
 */
export default function IssueCertificateModal({ cert, replace = false, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
  const input = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function pick(f) {
    setError('');
    if (!f) return;
    if (f.size > MAX_MB * 1024 * 1024) { setError(`That file is larger than ${MAX_MB} MB.`); return; }
    if (!/\.(pdf|png|jpe?g|webp)$/i.test(f.name)) { setError('Choose a PDF, PNG, JPG or WEBP file.'); return; }
    setFile(f);
  }

  async function submit(e) {
    e.preventDefault();
    if (!file) { setError('Choose the certificate file first.'); return; }
    setBusy(true);
    setError('');
    try { await issueCertificate(cert.enrollment_id, file, { replace }); onDone(); }
    catch (err) { setError(err.message); setBusy(false); }
  }

  const who = cert.name_on_certificate ? `${cert.name_title || ''} ${cert.name_on_certificate}`.trim() : cert.student_name || cert.student_email;
  return (
    <div className="modal-backdrop" onClick={() => !busy && onClose()}>
      <form className="modal cert-issue" role="dialog" aria-modal="true" aria-labelledby="ci-title" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 id="ci-title">{replace ? 'Replace the certificate file' : 'Approve and issue the certificate'}</h2>
        <dl className="ci-facts">
          <div><dt>Name on certificate</dt><dd>{who}</dd></div>
          <div><dt>Course</dt><dd>{cert.course_title}</dd></div>
          {cert.delivery_email && <div><dt>Student email</dt><dd>{cert.delivery_email}</dd></div>}
        </dl>
        <p>{replace ? 'The student will download the new file instead of the old one.' : 'Upload the finished certificate from your device. The student can download it on the website as soon as you issue it.'}</p>

        <input ref={input} type="file" accept={ACCEPT} hidden onChange={(e) => pick(e.target.files[0])} />
        {file ? (
          <div className="ci-file">
            <HugeiconsIcon icon={File02Icon} size={22} strokeWidth={1.5} />
            <span className="ci-file-name">{file.name}<small>{size(file.size)}</small></span>
            <button type="button" className="icon-btn" aria-label="Remove the file" disabled={busy} onClick={() => { setFile(null); input.current.value = ''; }}><HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.6} /></button>
          </div>
        ) : (
          <button type="button" className={`ci-drop${drag ? ' over' : ''}`} onClick={() => input.current.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}>
            <HugeiconsIcon icon={Upload04Icon} size={26} strokeWidth={1.5} />
            <strong>Choose the certificate file</strong>
            <small>or drop it here · PDF, PNG, JPG or WEBP · up to {MAX_MB} MB</small>
          </button>
        )}

        {error && <p className="modal-error" role="alert">{error}</p>}
        <div className="modal-btns">
          <button type="button" className="btn" disabled={busy} onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={busy || !file}>{busy ? 'Uploading…' : replace ? 'Replace file' : 'Upload and issue'}</button>
        </div>
      </form>
    </div>
  );
}
