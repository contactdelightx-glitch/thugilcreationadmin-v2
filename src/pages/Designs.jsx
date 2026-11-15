import { useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  ImageNotFound01Icon,
  Edit02Icon,
  Delete02Icon,
  AddSquareIcon,
} from '@hugeicons/core-free-icons';
import { fetchDesignCategories, fetchDesigns, updateDesignLabel, deleteDesign } from '../api';
import DesignEditModal from './DesignEditModal';
import useInfiniteList from '../useInfiniteList';
import ScrollFooter from '../components/ScrollFooter';

const LIMIT = 30;
const LABELS = ['all', 'new', 'sale', 'featured'];
const LABEL_OPTIONS = ['new', 'sale', 'featured'];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const money = (n) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// table columns per view. `h` = header, `r` = cell renderer
const dash = (v) => (v == null || v === '' ? <span className="muted">—</span> : v);
const C = {
  image: { h: 'Image', cls: 'col-img', r: (d) => <span className="thumb-sm"><Thumb src={d.image_url} alt={d.name || d.product_id} /></span> },
  name: { h: 'Name', r: (d) => <span className="cell-strong">{d.name || 'Free image'}</span> },
  productId: { h: 'Product ID', r: (d) => <span className="mono">{d.product_id}</span> },
  category: { h: 'Category', r: (d, ctx) => ctx.labelOf(d.category) },
  label: {
    h: 'Label',
    r: (d, ctx) => (
      <select
        className={`lbl-select ${d.label}`}
        value={d.label}
        disabled={ctx.saving === `${d.category}-${d.id}`}
        aria-label={`Label for ${d.name || d.product_id}`}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => ctx.onLabel(d, e.target.value)}
      >
        {LABEL_OPTIONS.map((l) => <option key={l} value={l}>{cap(l)}</option>)}
      </select>
    ),
  },
  price: { h: 'Price', r: (d) => <Price d={d} /> },
  designer: { h: 'Designer', r: (d) => d.designer_email },
  added: { h: 'Added', r: (d) => fmtDate(d.created_at) },
  cards: { h: 'Cards', num: true, r: (d) => dash(d.cards) },
  hooks: { h: 'Hooks', num: true, r: (d) => dash(d.hooks) },
  epi: { h: 'EPI', num: true, r: (d) => dash(d.epi) },
  ppi: { h: 'PPI', num: true, r: (d) => dash(d.ppi) },
  harness: { h: 'Harness', r: (d) => dash(d.harness_build) },
  imageType: { h: 'Type', r: (d) => dash(d.image_type) },
  jacquard: { h: 'Jacquard', r: (d) => dash(d.jacquard_type && cap(d.jacquard_type)) },
  bodyEpi: { h: 'Body EPI', num: true, r: (d) => dash(d.body_epi) },
  borderEpi: { h: 'Border EPI', num: true, r: (d) => dash(d.border_epi) },
  brHooks: { h: 'BR hooks', r: (d) => dash(d.br_hooks) },
  byHooks: { h: 'BY hooks', r: (d) => dash(d.by_hooks) },
  actions: {
    h: 'Actions',
    cls: 'col-actions',
    r: (d, ctx) => (
      <div className="row-actions">
        <button className="act" title="Edit" aria-label={`Edit ${d.name || d.product_id}`} onClick={() => ctx.onEdit(d)}>
          <HugeiconsIcon icon={Edit02Icon} size={18} strokeWidth={1.5} />
        </button>
        <button className="act danger" title="Delete" aria-label={`Delete ${d.name || d.product_id}`} onClick={() => ctx.onDelete(d)}>
          <HugeiconsIcon icon={Delete02Icon} size={18} strokeWidth={1.5} />
        </button>
      </div>
    ),
  },
  link: { h: 'Link', r: (d) => (d.redirect_url ? <span className="mono">{d.redirect_url.replace(/^https?:\/\//, '').slice(0, 28)}…</span> : dash(null)) },
};

const COLUMNS = {
  all: ['image', 'name', 'category', 'label', 'price', 'designer', 'added', 'actions'],
  weave: ['image', 'name', 'cards', 'hooks', 'epi', 'ppi', 'harness', 'imageType', 'label', 'price', 'designer', 'added', 'actions'],
  full_set: ['image', 'name', 'jacquard', 'ppi', 'bodyEpi', 'borderEpi', 'brHooks', 'byHooks', 'label', 'price', 'designer', 'added', 'actions'],
  free_image: ['image', 'productId', 'label', 'price', 'designer', 'added', 'link', 'actions'],
};
const columnsFor = (category) =>
  (COLUMNS[category] || (category === 'all' ? COLUMNS.all : COLUMNS.weave)).map((k) => C[k]);

function Thumb({ src, alt }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="thumb-fallback">
        <HugeiconsIcon icon={ImageNotFound01Icon} size={28} strokeWidth={1.5} />
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}

function Price({ d }) {
  const sale = Number(d.listing_rate) > Number(d.final_price);
  if (Number(d.final_price) === 0 && Number(d.listing_rate) === 0) return <span className="free">Free</span>;
  return (
    <span className="price">
      {money(d.final_price)}
      {sale && <s>{money(d.listing_rate)}</s>}
    </span>
  );
}

export default function Designs({ onNavigate }) {
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('all');
  const [label, setLabel] = useState('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(null);
  const [labelError, setLabelError] = useState('');
  const [editing, setEditing] = useState(null); // { category, id }
  const [deleting, setDeleting] = useState(null); // a design row
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    fetchDesignCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const list = useInfiniteList(
    ({ offset, limit, signal }) => fetchDesigns({ category, label, search: query, offset, limit, signal }),
    [category, label, query],
    LIMIT,
    (d) => `${d.category}-${d.id}`
  );
  const { items: data, loading, error } = list;
  const sameDesign = (a) => (x) => x.category === a.category && String(x.id) === String(a.id);

  async function changeLabel(d, next) {
    const prev = d.label;
    if (next === prev) return;
    const patchRow = (value) => list.updateWhere(sameDesign(d), { label: value });
    setLabelError('');
    setSaving(`${d.category}-${d.id}`);
    patchRow(next); // optimistic
    try {
      await updateDesignLabel(d.category, d.id, next);
      if (label !== 'all') list.removeWhere(sameDesign(d)); // no longer matches the label filter
    } catch (e) {
      patchRow(prev);
      setLabelError(e.message);
    } finally {
      setSaving(null);
    }
  }

  const closeDelete = () => { if (!busy) { setDeleting(null); setDeleteError(''); } };

  useEffect(() => {
    if (!deleting) return;
    const onKey = (e) => e.key === 'Escape' && closeDelete();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  async function confirmDelete() {
    setBusy(true);
    setDeleteError('');
    try {
      await deleteDesign(deleting.category, deleting.id);
      list.removeWhere(sameDesign(deleting));
      setDeleting(null);
      fetchDesignCategories().then(setCategories).catch(() => {}); // refresh tab counts
    } catch (e) {
      setDeleteError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const columns = columnsFor(category);
  const labelOf = (key) => categories.find((c) => c.key === key)?.label || key;
  const allCount = categories.reduce((n, c) => n + c.count, 0);
  const ctx = {
    labelOf,
    saving,
    onLabel: changeLabel,
    onEdit: (d) => setEditing({ category: d.category, id: d.id }),
    onDelete: (d) => setDeleting(d),
  };
  return (
    <div className="designs">
      <div className="cat-tabs">
        <button className={category === 'all' ? 'on' : ''} onClick={() => setCategory('all')}>
          All <span>{allCount || ''}</span>
        </button>
        {categories.map((c) => (
          <button key={c.key} className={category === c.key ? 'on' : ''} onClick={() => setCategory(c.key)}>
            {c.label} <span>{c.count}</span>
          </button>
        ))}
      </div>

      <div className="toolbar">
        <div className="search wide">
          <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.5} />
          <input placeholder="Search name, product ID or designer" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="toolbar-right">
          <div className="segmented">
            {LABELS.map((l) => (
              <button key={l} className={label === l ? 'on' : ''} onClick={() => setLabel(l)}>
                {cap(l)}
              </button>
            ))}
          </div>
          <button className="btn primary with-icon" onClick={() => onNavigate('Add Design')}>
            <HugeiconsIcon icon={AddSquareIcon} size={18} strokeWidth={1.5} /> Add design
          </button>
        </div>
      </div>

      {error && <div className="notice">Could not load designs: {error}</div>}
      {labelError && <div className="notice">Could not change label: {labelError}</div>}

      <div className={`table-wrap${loading && data.length ? ' loading' : ''}`}>
        <table className="design-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.h} className={`${c.cls || ''}${c.num ? ' num' : ''}`}>{c.h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={`${d.category}-${d.id}`}>
                {columns.map((c) => (
                  <td key={c.h} data-label={c.h} className={`${c.cls || ''}${c.num ? ' num' : ''}`}>{c.r(d, ctx)}</td>
                ))}
              </tr>
            ))}
            {loading && data.length === 0 && (
              <tr className="empty"><td colSpan={columns.length}>Loading designs…</td></tr>
            )}
            {!loading && !error && data.length === 0 && (
              <tr className="empty"><td colSpan={columns.length}>No designs found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <ScrollFooter list={list} noun="designs" />

      {editing && (
        <DesignEditModal
          target={editing}
          categoryLabel={labelOf(editing.category)}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            const match = sameDesign(saved);
            // keep the row in place; drop it if the new label no longer fits the filter
            if (label !== 'all' && saved.label !== label) list.removeWhere(match);
            else list.updateWhere(match, saved);
            setEditing(null);
          }}
        />
      )}

      {deleting && (
        <div className="modal-backdrop" onClick={closeDelete}>
          <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <h2>Delete design</h2>
            <p className="modal-user">{deleting.name || deleting.product_id} · {labelOf(deleting.category)}</p>
            <p>Permanently delete this design? This cannot be undone.</p>
            {deleteError && <p className="modal-error">{deleteError}</p>}
            <div className="modal-btns">
              <button className="btn" onClick={closeDelete} disabled={busy}>Cancel</button>
              <button className="btn primary danger" onClick={confirmDelete} disabled={busy}>
                {busy ? 'Working…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
