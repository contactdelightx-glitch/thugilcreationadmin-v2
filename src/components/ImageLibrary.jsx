import { useCallback, useEffect, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon, Copy01Icon, Tick02Icon, ImageNotFound01Icon } from '@hugeicons/core-free-icons';
import { fetchImages } from '../api';
import useInfiniteList from '../useInfiniteList';
import ScrollFooter from './ScrollFooter';
import { copyText } from '../clipboard';

const LIMIT = 24;

function Thumb({ src, alt }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="thumb-fallback">
        <HugeiconsIcon icon={ImageNotFound01Icon} size={22} strokeWidth={1.5} />
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}

/**
 * Browse the bucket's images inside another page.
 * Click an image to copy its URL. `onFill(field, url)` (optional) adds
 * "Preview" / "Original" buttons that put the URL straight into a form.
 */
export default function ImageLibrary({ onFill }) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState('');
  const [note, setNote] = useState('');
  const noteTimer = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const list = useInfiniteList(
    ({ offset, limit, signal }) => fetchImages({ search: query, offset, limit, signal }),
    [query],
    LIMIT,
    (img) => img.key
  );
  const { items, total, loading, error } = list;

  const flash = useCallback((msg) => {
    setNote(msg);
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(''), 1800);
  }, []);

  async function copy(img) {
    if (await copyText(img.url)) {
      setCopied(img.key);
      flash('Image URL copied');
      setTimeout(() => setCopied((c) => (c === img.key ? '' : c)), 1800);
    } else {
      flash('Could not copy to the clipboard');
    }
  }

  function fill(e, field, img, label) {
    e.stopPropagation();
    onFill(field, img.url);
    flash(`${label} URL filled in`);
  }

  return (
    <div className="image-library">
      <div className="library-head">
        <h3 className="drawer-section first">Image library</h3>
        <span className="muted">{loading && items.length === 0 ? '' : `${total.toLocaleString('en-IN')} images`}</span>
      </div>

      <div className="search library-search">
        <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.5} />
        <input
          placeholder="Search by file name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
        />
      </div>

      <p className="library-hint">
        {onFill ? 'Click an image to copy its URL, or use the buttons to fill the fields.' : 'Click an image to copy its URL.'}
      </p>

      {/* the list scrolls inside this box */}
      <div className="library-scroll" data-scroll-root>
        {error && <div className="notice">Could not load images: {error}</div>}
        <div className="library-grid">
          {loading && items.length === 0 && !error && Array.from({ length: 9 }, (_, i) => <div key={i} className="image-skeleton" />)}
          {items.map((img) => (
            <div
              key={img.key}
              className="image-tile"
              role="button"
              tabIndex={0}
              title={img.name}
              onClick={() => copy(img)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), copy(img))}
            >
              <Thumb src={img.url} alt={img.name} />
              <div className="tile-overlay lib-overlay">
                <span className={`tile-copy${copied === img.key ? ' on' : ''}`}>
                  <HugeiconsIcon icon={copied === img.key ? Tick02Icon : Copy01Icon} size={14} strokeWidth={1.5} />
                  {copied === img.key ? 'Copied' : 'Copy URL'}
                </span>
                {onFill && (
                  <div className="lib-fill">
                    <button type="button" onClick={(e) => fill(e, 'image_url', img, 'Image')}>Image</button>
                    <button type="button" onClick={(e) => fill(e, 'original_image_url', img, 'Original')}>Original</button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {!loading && !error && items.length === 0 && (
            <div className="grid-empty">{query ? `No images match “${query}”.` : 'No images yet.'}</div>
          )}
        </div>
        <ScrollFooter list={list} noun="images" />
      </div>

      <div className={`library-note${note ? ' show' : ''}`} role="status" aria-live="polite">{note}</div>
    </div>
  );
}
