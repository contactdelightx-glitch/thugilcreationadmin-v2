import { useCallback, useEffect, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  Upload04Icon,
  CloudUploadIcon,
  Copy01Icon,
  Tick02Icon,
  LinkSquare02Icon,
  ImageNotFound01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  AlertCircleIcon,
} from '@hugeicons/core-free-icons';
import { fetchImages, uploadImage } from '../api';
import useInfiniteList from '../useInfiniteList';
import ScrollFooter from '../components/ScrollFooter';
import { copyText } from '../clipboard';

const LIMIT = 36;
const MAX_MB = 25;
const ALLOWED = ['bmp', 'jpg', 'jpeg', 'png', 'gif', 'webp'];
const extOf = (n) => (n.split('.').pop() || '').toLowerCase();
const fmtSize = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

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

export default function Images() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const [uploads, setUploads] = useState([]); // { id, name, status, url, error }
  const [uploading, setUploading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const fileInput = useRef(null);

  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  const [copied, setCopied] = useState('');
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);

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
  const { items: data, total, loading, error } = list;

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 1800);
  }, []);

  async function copy(id, text, message = 'Image URL copied') {
    if (await copyText(text)) {
      setCopied(id);
      showToast(message);
      setTimeout(() => setCopied((c) => (c === id ? '' : c)), 1800);
    } else {
      showToast('Could not copy to the clipboard');
    }
  }

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => f.type.startsWith('image/') || ALLOWED.includes(extOf(f.name)));
    const skipped = (fileList?.length || 0) - files.length;
    if (skipped > 0 && !files.length) return showToast('Only image files can be uploaded');
    if (!files.length || uploading) return;

    const items = files.map((f, i) => {
      let err = '';
      if (!ALLOWED.includes(extOf(f.name))) err = 'Unsupported image type';
      else if (f.size > MAX_MB * 1024 * 1024) err = `Larger than ${MAX_MB} MB`;
      return { id: `${Date.now()}-${i}`, file: f, name: f.name, status: err ? 'error' : 'queued', error: err };
    });
    setUploads(items.map(({ file, ...rest }) => rest));
    setPanelOpen(true);
    setUploading(true);

    const patch = (id, change) => setUploads((u) => u.map((x) => (x.id === id ? { ...x, ...change } : x)));
    let anyDone = false;
    for (const it of items) {
      if (it.status === 'error') continue;
      patch(it.id, { status: 'uploading' });
      try {
        const saved = await uploadImage(it.file);
        patch(it.id, { status: 'done', url: saved.url });
        anyDone = true;
      } catch (e) {
        patch(it.id, { status: 'error', error: e.message });
      }
    }
    setUploading(false);
    if (anyDone) {
      setSearch('');
      setQuery('');
      list.reload(); // newest first, so the new images appear at the top
    }
    if (fileInput.current) fileInput.current.value = '';
  }

  // drag files anywhere over the page
  const isFileDrag = (e) => Array.from(e.dataTransfer?.types || []).includes('Files');
  const onDragEnter = (e) => { if (isFileDrag(e)) { e.preventDefault(); dragDepth.current++; setDragging(true); } };
  const onDragOver = (e) => { if (isFileDrag(e)) e.preventDefault(); };
  const onDragLeave = (e) => { if (isFileDrag(e) && --dragDepth.current <= 0) { dragDepth.current = 0; setDragging(false); } };
  const onDrop = (e) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const done = uploads.filter((u) => u.status === 'done');
  const failed = uploads.filter((u) => u.status === 'error').length;
  const finished = uploads.length > 0 && !uploading;

  return (
    <div className="images-page" onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      <div className="images-bar">
        <div className="search wide">
          <HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={1.5} />
          <input placeholder="Search by file name" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <span className="images-count">
          {loading && data.length === 0 ? '' : `${total.toLocaleString('en-IN')} images`}
        </span>
        <button className="btn primary with-icon upload-btn" onClick={() => fileInput.current?.click()} disabled={uploading}>
          <HugeiconsIcon icon={Upload04Icon} size={18} strokeWidth={1.5} /> {uploading ? 'Uploading…' : 'Upload images'}
        </button>
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          accept=".bmp,.jpg,.jpeg,.png,.gif,.webp,image/*"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      <p className="images-hint">Click an image to copy its URL. You can also drag images anywhere on this page to upload them.</p>

      {error && <div className="notice">Could not load images: {error}</div>}

      <div className={`image-grid${loading && data.length ? ' loading' : ''}`}>
        {loading && data.length === 0 && !error && Array.from({ length: 12 }, (_, i) => <div key={i} className="image-skeleton" />)}

        {data.map((img) => (
          <div
            key={img.key}
            className="image-tile"
            role="button"
            tabIndex={0}
            title={img.name}
            onClick={() => copy(img.key, img.url)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), copy(img.key, img.url))}
          >
            <Thumb src={img.url} alt={img.name} />
            <a
              className="tile-open"
              href={img.url}
              target="_blank"
              rel="noreferrer"
              title="Open full image"
              aria-label={`Open ${img.name}`}
              onClick={(e) => e.stopPropagation()}
            >
              <HugeiconsIcon icon={LinkSquare02Icon} size={16} strokeWidth={1.5} />
            </a>
            <div className="tile-overlay">
              <span className={`tile-copy${copied === img.key ? ' on' : ''}`}>
                <HugeiconsIcon icon={copied === img.key ? Tick02Icon : Copy01Icon} size={16} strokeWidth={1.5} />
                {copied === img.key ? 'Copied' : 'Copy URL'}
              </span>
              <div className="tile-caption">
                <span className="tile-name">{img.name}</span>
                <span className="tile-meta">{fmtSize(img.size)} · {fmtDate(img.lastModified)}</span>
              </div>
            </div>
          </div>
        ))}

        {!loading && !error && data.length === 0 && (
          <div className="grid-empty">{query ? `No images match “${query}”.` : 'No images yet — upload some to get started.'}</div>
        )}
      </div>

      <ScrollFooter list={list} noun="images" />

      {dragging && (
        <div className="drop-overlay">
          <HugeiconsIcon icon={CloudUploadIcon} size={48} strokeWidth={1.5} />
          <strong>Drop images to upload</strong>
          <span>BMP, JPG, PNG, GIF or WebP · up to {MAX_MB} MB each</span>
        </div>
      )}

      {uploads.length > 0 && (
        <div className="upload-panel">
          <div className="upload-panel-head">
            <strong>
              {uploading
                ? `Uploading ${done.length + 1 > uploads.length ? uploads.length : done.length + 1} of ${uploads.length}…`
                : failed
                  ? `${done.length} uploaded, ${failed} failed`
                  : `${done.length} ${done.length === 1 ? 'image' : 'images'} uploaded`}
            </strong>
            <div className="upload-panel-actions">
              <button className="icon-btn ghost" onClick={() => setPanelOpen((o) => !o)} aria-label={panelOpen ? 'Collapse' : 'Expand'}>
                <HugeiconsIcon icon={panelOpen ? ArrowDown01Icon : ArrowUp01Icon} size={16} strokeWidth={1.5} />
              </button>
              {!uploading && (
                <button className="icon-btn ghost" onClick={() => setUploads([])} aria-label="Dismiss">
                  <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={1.5} />
                </button>
              )}
            </div>
          </div>
          <div className="upload-progress"><span style={{ width: `${((uploads.length - uploads.filter((u) => u.status === 'queued' || u.status === 'uploading').length) / uploads.length) * 100}%` }} /></div>

          {panelOpen && (
            <div className="upload-panel-body">
              {finished && done.length > 1 && (
                <button className="btn with-icon wide" onClick={() => copy('all', done.map((u) => u.url).join('\n'), `${done.length} URLs copied`)}>
                  <HugeiconsIcon icon={copied === 'all' ? Tick02Icon : Copy01Icon} size={16} strokeWidth={1.5} />
                  {copied === 'all' ? 'Copied' : `Copy all ${done.length} URLs`}
                </button>
              )}
              {uploads.map((u) => (
                <div key={u.id} className={`upload-row ${u.status}`}>
                  <HugeiconsIcon
                    icon={u.status === 'done' ? CheckmarkCircle02Icon : u.status === 'error' ? AlertCircleIcon : CloudUploadIcon}
                    size={18}
                    strokeWidth={1.5}
                  />
                  <div className="upload-info">
                    <span className="upload-name">{u.name}</span>
                    {u.status === 'error' && <span className="upload-error">{u.error}</span>}
                    {u.status === 'queued' && <span className="muted">Waiting</span>}
                    {u.status === 'uploading' && <span className="muted">Uploading…</span>}
                  </div>
                  {u.status === 'done' && (
                    <button className="icon-btn ghost" onClick={() => copy(u.id, u.url)} aria-label={`Copy URL of ${u.name}`} title="Copy URL">
                      <HugeiconsIcon icon={copied === u.id ? Tick02Icon : Copy01Icon} size={16} strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className={`toast${toast ? ' show' : ''}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}
