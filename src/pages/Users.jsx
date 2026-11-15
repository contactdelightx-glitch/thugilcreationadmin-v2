import { useCallback, useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  UserBlock01Icon,
  UserRemove01Icon,
  Delete02Icon,
  UserCheck01Icon,
} from '@hugeicons/core-free-icons';
import { fetchUsers, updateUserStatus, deleteUser } from '../api';
import useInfiniteList from '../useInfiniteList';
import ScrollFooter from '../components/ScrollFooter';

const LIMIT = 30;
const FILTERS = ['all', 'active', 'suspended', 'removed'];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// what each action does, and the wording of its confirmation
const ACTIONS = {
  suspend: { label: 'Suspend', icon: UserBlock01Icon, status: 'suspended', confirm: 'Suspend this user? They will be blocked until you reactivate them.' },
  reactivate: { label: 'Reactivate', icon: UserCheck01Icon, status: 'active', confirm: 'Reactivate this user?' },
  remove: { label: 'Remove', icon: UserRemove01Icon, status: 'removed', confirm: 'Remove this user? They will be hidden but kept, and you can restore them later.' },
  restore: { label: 'Restore', icon: UserCheck01Icon, status: 'active', confirm: 'Restore this removed user?' },
  delete: { label: 'Delete', icon: Delete02Icon, danger: true, confirm: 'Permanently delete this user? This cannot be undone.' },
};

// which actions are offered for each status
const ACTIONS_FOR = {
  active: ['suspend', 'remove', 'delete'],
  suspended: ['reactivate', 'remove', 'delete'],
  removed: ['restore', 'delete'],
};

export default function Users() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState(''); // debounced search
  const [status, setStatus] = useState('all');
  const [pending, setPending] = useState(null); // { user, action }
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const list = useInfiniteList(
    ({ offset, limit, signal }) => fetchUsers({ offset, limit, search: query, status, signal }),
    [query, status],
    LIMIT,
    (u) => u.customer_id
  );
  const { items: data, loading, error } = list;

  const closeModal = useCallback(() => { if (!busy) { setPending(null); setActionError(''); } }, [busy]);

  useEffect(() => {
    if (!pending) return;
    const onKey = (e) => e.key === 'Escape' && closeModal();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending, closeModal]);

  async function confirmAction() {
    const { user, action } = pending;
    setBusy(true);
    setActionError('');
    try {
      const isUser = (u) => u.customer_id === user.customer_id;
      if (action === 'delete') {
        await deleteUser(user.customer_id);
        list.removeWhere(isUser);
      } else {
        const saved = await updateUserStatus(user.customer_id, ACTIONS[action].status);
        // under a status filter the row no longer belongs once its status changed
        if (status === 'all') list.updateWhere(isUser, { status: saved.status });
        else list.removeWhere(isUser);
      }
      setPending(null);
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="users">
      <div className="toolbar">
        <div className="search wide">
          <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.5} />
          <input
            placeholder="Search name, email, phone or ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="segmented">
          {FILTERS.map((s) => (
            <button key={s} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>
              {cap(s)}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="notice">Could not load users: {error}</div>}

      <div className={`table-wrap${loading && data.length ? ' loading' : ''}`}>
        <table>
          <thead>
            <tr>
              <th className="col-id">ID</th>
              <th>Full name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Joined</th>
              <th className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((u) => (
              <tr key={u.customer_id} className={u.status === 'removed' ? 'is-removed' : ''}>
                <td data-label="ID" className="col-id">{u.customer_id}</td>
                <td data-label="Full name">{u.full_name || <span className="muted">—</span>}</td>
                <td data-label="Email">{u.email}</td>
                <td data-label="Phone">{u.phone || <span className="muted">—</span>}</td>
                <td data-label="Status"><span className={`status ${u.status}`}>{cap(u.status)}</span></td>
                <td data-label="Joined">{fmtDate(u.created_at)}</td>
                <td data-label="Actions" className="col-actions">
                  <div className="row-actions">
                    {ACTIONS_FOR[u.status].map((key) => (
                      <button
                        key={key}
                        className={`act${ACTIONS[key].danger ? ' danger' : ''}`}
                        title={ACTIONS[key].label}
                        aria-label={`${ACTIONS[key].label} ${u.email}`}
                        onClick={() => setPending({ user: u, action: key })}
                      >
                        <HugeiconsIcon icon={ACTIONS[key].icon} size={18} strokeWidth={1.5} />
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {loading && data.length === 0 && (
              <tr className="empty"><td colSpan={7}>Loading users…</td></tr>
            )}
            {!loading && !error && data.length === 0 && (
              <tr className="empty"><td colSpan={7}>No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ScrollFooter list={list} noun="users" />

      {pending && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>{ACTIONS[pending.action].label} user</h2>
            <p className="modal-user">
              {pending.user.full_name || 'Unnamed'} · {pending.user.email}
            </p>
            <p>{ACTIONS[pending.action].confirm}</p>
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
