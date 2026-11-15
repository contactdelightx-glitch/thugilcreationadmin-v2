import { useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Copy01Icon, Tick02Icon, ViewIcon, ViewOffIcon, MagicWand01Icon } from '@hugeicons/core-free-icons';
import { createDesigner } from '../api';
import { copyText } from '../clipboard';

// no look-alike characters (0/O, 1/l/I) so a password can be read out or retyped safely
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
function generatePassword(length = 14) {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/**
 * Two steps: the form, then a one-time view of the credentials.
 * The password is only stored as a hash, so this is the admin's only chance to copy it.
 */
export default function AddClientModal({ onClose, onCreated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('active');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [created, setCreated] = useState(null); // { email, password, status }
  const [copied, setCopied] = useState('');

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !saving && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // after creating, closing also refreshes the list
  function close() {
    if (created) onCreated();
    onClose();
  }

  function generate() {
    setPassword(generatePassword());
    setShow(true); // the admin should see what was generated
    setFieldErrors((x) => ({ ...x, password: undefined }));
  }

  async function copy(key, text) {
    if (await copyText(text)) {
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? '' : c)), 1800);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      const saved = await createDesigner({ email, password, status });
      setCreated({ email: saved.email, password, status: saved.status });
    } catch (err) {
      setError(err.fields && Object.keys(err.fields).length ? '' : err.message);
      setFieldErrors(err.fields || {});
    } finally {
      setSaving(false);
    }
  }

  const CopyBtn = ({ id, text, label }) => (
    <button type="button" className="icon-btn" onClick={() => copy(id, text)} aria-label={label} title={label}>
      <HugeiconsIcon icon={copied === id ? Tick02Icon : Copy01Icon} size={18} strokeWidth={1.5} />
    </button>
  );

  if (created) {
    return (
      <div className="modal-backdrop" onClick={close}>
        <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
          <h2>Client created</h2>
          <p>Share these login details with the client. <strong>The password can’t be viewed again</strong> — it is stored only in scrambled form — so copy it now.</p>

          <div className="cred">
            <span className="cred-label">Email</span>
            <div className="cred-row"><code>{created.email}</code><CopyBtn id="email" text={created.email} label="Copy email" /></div>
          </div>
          <div className="cred">
            <span className="cred-label">Password</span>
            <div className="cred-row"><code>{created.password}</code><CopyBtn id="password" text={created.password} label="Copy password" /></div>
          </div>
          <p className="cred-status">Status: <strong>{created.status === 'active' ? 'Active' : 'Suspended'}</strong>{created.status === 'suspended' ? ' — they can’t add designs until you reactivate them.' : ''}</p>

          <div className="modal-btns">
            <button className="btn" onClick={() => copy('both', `Email: ${created.email}\nPassword: ${created.password}`)}>
              {copied === 'both' ? 'Copied' : 'Copy both'}
            </button>
            <button className="btn primary" onClick={close}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={() => !saving && close()}>
      <form className="modal form-modal narrow" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} onSubmit={submit} noValidate>
        <h2>Add client</h2>
        <p className="modal-user">Create a designer account. You choose the email, password and status.</p>

        <div className="form-stack">
          <div className={`field${fieldErrors.email ? ' has-error' : ''}`}>
            <label htmlFor="client-email">Email</label>
            <input id="client-email" type="email" autoComplete="off" autoFocus value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors((x) => ({ ...x, email: undefined })); }} />
            {fieldErrors.email && <small className="field-error">Email {fieldErrors.email}</small>}
          </div>

          <div className={`field${fieldErrors.password ? ' has-error' : ''}`}>
            <label htmlFor="client-password">Password</label>
            <div className="pw-row">
              <div className="pw-input">
                <input id="client-password" type={show ? 'text' : 'password'} autoComplete="new-password" value={password}
                  placeholder="At least 8 characters"
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors((x) => ({ ...x, password: undefined })); }} />
                <button type="button" className="pw-toggle" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
                  <HugeiconsIcon icon={show ? ViewOffIcon : ViewIcon} size={18} strokeWidth={1.5} />
                </button>
              </div>
              <button type="button" className="btn with-icon" onClick={generate}>
                <HugeiconsIcon icon={MagicWand01Icon} size={16} strokeWidth={1.5} /> Generate
              </button>
            </div>
            {fieldErrors.password && <small className="field-error">Password {fieldErrors.password}</small>}
          </div>

          <div className="field">
            <span className="field-label">Status</span>
            <div className="chips" role="radiogroup" aria-label="Status">
              {[['active', 'Active'], ['suspended', 'Suspended']].map(([v, label]) => (
                <button key={v} type="button" role="radio" aria-checked={status === v} className={status === v ? 'on' : ''} onClick={() => setStatus(v)}>
                  {label}
                </button>
              ))}
            </div>
            <small className="field-hint">{status === 'active' ? 'Can add designs right away.' : 'Cannot add designs until you reactivate them.'}</small>
          </div>
        </div>

        {error && <p className="modal-error">{error}</p>}

        <div className="modal-btns">
          <button type="button" className="btn" onClick={close} disabled={saving}>Cancel</button>
          <button type="submit" className="btn primary" disabled={saving}>{saving ? 'Creating…' : 'Create client'}</button>
        </div>
      </form>
    </div>
  );
}
