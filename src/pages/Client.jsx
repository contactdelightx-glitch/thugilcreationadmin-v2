import { useCallback, useEffect, useMemo, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon, UserBlock01Icon, UserCheck01Icon, Delete02Icon, AddSquareIcon } from '@hugeicons/core-free-icons';
import { fetchDesigners, updateDesignerStatus, deleteDesigner } from '../api';
import AddClientModal from '../components/AddClientModal';

const cap = (s) => s[0].toUpperCase() + s.slice(1);
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const ROLE = { tenant: 'Designer', superadmin: 'Super admin' };
const plural = (n, word) => `${n.toLocaleString('en-IN')} ${word}${n === 1 ? '' : 's'}`;

export default function Client() {
  const [designers, setDesigners] = useState(null); // null while loading
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState(null); // { designer, action }
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback((signal) => {
    return fetchDesigners({ signal })
      .then((r) => { setDesigners(r.data); setError(''); })
      .catch((e) => e.name !== 'AbortError' && setError(e.message));
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  const owner = (designers || []).find((d) => d.type === 'superadmin');

  // what each action does and says; the delete text depends on the designer
  const ACTIONS = {
    suspend: {
      label: 'Suspend', icon: UserBlock01Icon,
      title: 'Suspend client',
      text: () => 'This client will no longer be able to add designs. Their existing designs stay as they are, and you can reactivate them any time.',
    },
    reactivate: {
      label: 'Reactivate', icon: UserCheck01Icon,
      title: 'Reactivate client',
      text: () => 'This client will be able to add designs again.',
    },
    delete: {
      label: 'Delete', icon: Delete02Icon, danger: true,
      title: 'Delete client',
      text: (d) =>
        `The client will be deleted and cannot be restored. ${d.designs ? `Their ${plural(d.designs, 'design')} will NOT be deleted — they will be kept and reassigned to ${owner ? owner.email : 'the owner'}.` : 'They have no designs.'}`,
    },
  };

  const actionsFor = (d) => (d.status === 'active' ? ['suspend', 'delete'] : ['reactivate', 'delete']);

  const closeModal = useCallback(() => { if (!busy) { setPending(null); setActionError(''); } }, [busy]);

  useEffect(() => {
    if (!pending) return undefined;
    const onKey = (e) => e.key === 'Escape' && closeModal();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending, closeModal]);

  async function confirmAction() {
    const { designer, action } = pending;
    setBusy(true);
    setActionError('');
    try {
      if (action === 'delete') {
        const r = await deleteDesigner(designer.id);
        setNotice(
          r.reassigned
            ? `${r.deleted} was deleted. Their ${plural(r.reassigned, 'design')} ${r.reassigned === 1 ? 'was' : 'were'} kept and reassigned to ${r.reassignedTo}.`
            : `${r.deleted} was deleted.`
        );
      } else {
        await updateDesignerStatus(designer.id, action === 'suspend' ? 'suspended' : 'active');
        setNotice('');
      }
      await load(); // counts change for the owner after a delete, so reload the list
      setPending(null);
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (designers || []).filter((d) => !q || d.email.toLowerCase().includes(q));
  }, [designers, search]);

  const totalDesigns = (designers || []).reduce((n, d) => n + d.designs, 0);

  return (
    <div className="clients">
      <div className="toolbar">
        <div className="search wide">
          <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.5} />
          <input placeholder="Search by email" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {designers && (
          <span className="muted client-summary">
            {designers.length} designers · {totalDesigns.toLocaleString('en-IN')} designs
          </span>
        )}
        <button className="btn primary with-icon" onClick={() => { setNotice(''); setAdding(true); }}>
          <HugeiconsIcon icon={AddSquareIcon} size={18} strokeWidth={1.5} /> Add client
        </button>
      </div>

      {error && <div className="notice">Could not load designers: {error}</div>}
      {notice && (
        <div className="notice done">
          <span>{notice}</span>
          <button className="btn small" onClick={() => setNotice('')}>Dismiss</button>
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="col-id">ID</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th className="num">Designs</th>
              <th>Joined</th>
              <th className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((d) => (
              <tr key={d.id} className={d.status !== 'active' ? 'is-removed' : ''}>
                <td data-label="ID" className="col-id">{d.id}</td>
                <td data-label="Email" className="cell-strong">{d.email}</td>
                <td data-label="Role">{ROLE[d.type] || cap(d.type)}</td>
                <td data-label="Status"><span className={`status ${d.status === 'active' ? 'active' : 'suspended'}`}>{cap(d.status)}</span></td>
                <td data-label="Designs" className="num">{d.designs.toLocaleString('en-IN')}</td>
                <td data-label="Joined">{fmtDate(d.created_at)}</td>
                <td data-label="Actions" className="col-actions">
                  {d.type === 'superadmin' ? (
                    <span className="muted owner-note">Owner</span>
                  ) : (
                    <div className="row-actions">
                      {actionsFor(d).map((key) => (
                        <button
                          key={key}
                          className={`act${ACTIONS[key].danger ? ' danger' : ''}`}
                          title={ACTIONS[key].label}
                          aria-label={`${ACTIONS[key].label} ${d.email}`}
                          onClick={() => setPending({ designer: d, action: key })}
                        >
                          <HugeiconsIcon icon={ACTIONS[key].icon} size={18} strokeWidth={1.5} />
                        </button>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!designers && !error && <tr className="empty"><td colSpan={7}>Loading designers…</td></tr>}
            {designers && shown.length === 0 && (
              <tr className="empty"><td colSpan={7}>{search ? `No designers match “${search.trim()}”.` : 'No designers yet.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {adding && <AddClientModal onClose={() => setAdding(false)} onCreated={() => load()} />}

      {pending && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>{ACTIONS[pending.action].title}</h2>
            <p className="modal-user">{pending.designer.email}</p>
            <p>{ACTIONS[pending.action].text(pending.designer)}</p>
            {actionError && <p className="modal-error">{actionError}</p>}
            <div className="modal-btns">
              <button className="btn" onClick={closeModal} disabled={busy}>Cancel</button>
              <button
                className={`btn primary${ACTIONS[pending.action].danger ? ' danger' : ''}`}
                onClick={confirmAction}
                disabled={busy}
              >
                {busy ? 'Working…' : ACTIONS[pending.action].label}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
