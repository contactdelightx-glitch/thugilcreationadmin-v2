import { useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon, ArrowLeft01Icon, Download01Icon } from '@hugeicons/core-free-icons';
import { fetchDesignerDesigns, designDownloadUrl } from '../api';
import useInfiniteList from '../useInfiniteList';
import ScrollFooter from './ScrollFooter';

const LIMIT = 36;

// What one client has uploaded: each design's name and picture, with a button to download the original file.
export default function ClientDesigns({ designer, onBack }) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const list = useInfiniteList(
    ({ offset, limit, signal }) => fetchDesignerDesigns(designer.id, { search: query, offset, limit, signal }),
    [designer.id, query],
    LIMIT,
    (d) => `${d.category}-${d.id}`
  );
  const { items, total, loading, error } = list;

  return (
    <div className="client-designs">
      <div className="toolbar">
        <button className="btn with-icon" onClick={onBack}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={1.5} /> All clients
        </button>
        <div className="search wide">
          <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.5} />
          <input placeholder="Search a design name" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="client-designs-head">
        <h2>{designer.email}</h2>
        <span className="muted">{loading && !items.length ? 'Loading…' : `${total.toLocaleString('en-IN')} ${total === 1 ? 'design' : 'designs'}${query ? ' found' : ' uploaded'}`}</span>
      </div>

      {error && <div className="notice">Could not load designs: {error}</div>}

      <div className={`cd-grid${loading && items.length ? ' loading' : ''}`}>
        {items.map((d) => (
          <figure key={`${d.category}-${d.id}`} className="cd-item">
            <div className="cd-img"><img src={d.image_url} alt={d.name || 'Free design'} loading="lazy" referrerPolicy="no-referrer" /></div>
            <figcaption title={d.name || ''}>{d.name || `Free design #${d.id}`}</figcaption>
            <a className="cd-dl" href={designDownloadUrl(d.category, d.id)} download aria-label={`Download ${d.name || `design ${d.id}`}`}>
              <HugeiconsIcon icon={Download01Icon} size={16} strokeWidth={1.6} /> Download
            </a>
          </figure>
        ))}
      </div>

      {!loading && !error && items.length === 0 && (
        <p className="muted cd-empty">{query ? `No designs match “${query}”.` : 'This client has not uploaded any designs yet.'}</p>
      )}

      <ScrollFooter list={list} noun="designs" />
    </div>
  );
}
