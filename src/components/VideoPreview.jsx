import { useEffect, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, PlayIcon } from '@hugeicons/core-free-icons';
import { fetchVideoSource } from '../api';

/**
 * A small picture of a video with a play mark. Clicking it plays the real video in a window.
 * `source` ({ video_url, thumbnail_url }) is for a video that is not saved yet (just uploaded): it is played from that link.
 */
export function VideoThumb({ video, source }) {
  const [open, setOpen] = useState(false);
  const [broken, setBroken] = useState(false);
  return (
    <>
      <button type="button" className="vthumb" onClick={() => setOpen(true)} aria-label={`Play ${video.title}`} title="Play this video">
        {video.thumbnail_url && !broken
          ? <img src={video.thumbnail_url} alt="" loading="lazy" onError={() => setBroken(true)} />
          : <span className="vthumb-empty" />}
        <span className="vthumb-play"><HugeiconsIcon icon={PlayIcon} size={16} strokeWidth={1.8} /></span>
      </button>
      {open && <VideoPreview video={video} source={source} onClose={() => setOpen(false)} />}
    </>
  );
}

// the video plays with the browser's own HLS support (Safari) or with hls.js (Chrome, Edge, Firefox)
function VideoPreview({ video, source, onClose }) {
  const ref = useRef(null);
  const [state, setState] = useState(source ? { loading: false, error: '', src: source } : { loading: true, error: '', src: null });

  useEffect(() => {
    if (source) return undefined;
    let live = true;
    fetchVideoSource(video.id)
      .then((s) => live && setState({ loading: false, error: '', src: s }))
      .catch((e) => live && setState({ loading: false, error: e.message, src: null }));
    return () => { live = false; };
  }, [video.id, source]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [onClose]);

  useEffect(() => {
    const el = ref.current;
    const url = state.src && state.src.video_url;
    if (!el || !url) return undefined;
    let hls;
    let gone = false;
    const fail = () => !gone && setState((s) => ({ ...s, error: 'This video could not be played. Check its link.' }));
    if (el.canPlayType('application/vnd.apple.mpegurl')) {
      el.src = url;
    } else if (/\.m3u8(\?|$)/i.test(url)) {
      import('hls.js').then(({ default: Hls }) => {
        if (gone) return;
        if (!Hls.isSupported()) return fail();
        hls = new Hls();
        hls.on(Hls.Events.ERROR, (_, d) => d.fatal && fail());
        hls.loadSource(url);
        hls.attachMedia(el);
      }).catch(fail);
    } else {
      el.src = url; // a plain video file
    }
    el.play().catch(() => {}); // starts muted-free playback when the browser allows it
    return () => { gone = true; hls?.destroy(); el.removeAttribute('src'); el.load(); };
  }, [state.src]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="vpreview" role="dialog" aria-modal="true" aria-label={video.title} onClick={(e) => e.stopPropagation()}>
        <div className="vpreview-head">
          <strong title={video.title}>{video.title}</strong>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={1.6} /></button>
        </div>
        <div className="vpreview-stage">
          {state.loading && <p className="muted">Loading…</p>}
          {state.error && <p className="vpreview-error">{state.error}</p>}
          {state.src && !state.error && <video ref={ref} controls playsInline poster={state.src.thumbnail_url || undefined} />}
        </div>
      </div>
    </div>
  );
}
