import { useEffect, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Upload04Icon, Cancel01Icon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import * as tus from 'tus-js-client';
import { startVideoUpload, fetchVideoStatus } from '../api';

const OK_EXT = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'm4v'];
const mb = (b) => (b >= 1073741824 ? `${(b / 1073741824).toFixed(1)} GB` : `${Math.max(1, Math.round(b / 1048576))} MB`);

/**
 * The "Upload" button of one video, with its progress.
 * The browser sends the file straight to Bunny (resumable, so a dropped connection carries on), then Bunny
 * encodes it; when it is ready, onDone({ bunny_video_id, video_url, thumbnail_url, duration_seconds, available_resolutions })
 * fills the video's link and length. onState({ phase, percent, note, cancel }) lets the row show the progress under
 * itself (see UploadStatus) and tells the page not to let go of the form meanwhile.
 */
export default function VideoUploader({ title, label, replacing, onDone, onState }) {
  const [phase, setPhase] = useState('idle'); // idle | sending | processing | done | error
  const [percent, setPercent] = useState(0);
  const [note, setNote] = useState('');
  const pick = useRef(null);
  const job = useRef(null); // { tus, videoId, timer, cancelled }

  const busy = phase === 'sending' || phase === 'processing';
  useEffect(() => { onState?.({ phase, percent, note, cancel }); }); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { // leaving the page stops the checking (an upload in flight is simply dropped)
    if (job.current) { job.current.cancelled = true; clearTimeout(job.current.timer); job.current.tus?.abort(); }
    onState?.({ phase: 'idle', percent: 0, note: '' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fail = (msg) => { setPhase('error'); setNote(msg); job.current = null; };

  function poll(videoId) {
    const j = job.current;
    if (!j || j.cancelled) return;
    fetchVideoStatus(videoId).then((s) => {
      if (j.cancelled) return;
      if (s.status === 'completed') {
        setPhase('done'); setPercent(100); setNote('Uploaded and ready');
        job.current = null;
        onDone({ bunny_video_id: videoId, video_url: s.video_url, thumbnail_url: s.thumbnail_url, duration_seconds: s.duration_seconds, available_resolutions: s.available_resolutions });
      } else if (s.status === 'failed') {
        fail('Bunny could not process this video. Try another file.');
      } else {
        setPercent(Math.max(0, Math.min(99, Math.round(s.progress || 0))));
        j.timer = setTimeout(() => poll(videoId), 4000);
      }
    }).catch(() => { if (!j.cancelled) j.timer = setTimeout(() => poll(videoId), 6000); }); // a hiccup in the check is retried
  }

  async function start(file) {
    if (pick.current) pick.current.value = '';
    if (!file) return;
    if (!title.trim()) return fail('Give the video a title first.');
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!OK_EXT.includes(ext) && !file.type.startsWith('video/')) return fail('Choose a video file (MP4, MOV, MKV, AVI or WEBM).');
    setPhase('sending'); setPercent(0); setNote(`${file.name} · ${mb(file.size)}`);
    let started;
    try { started = await startVideoUpload(title.trim()); } catch (e) { return fail(e.message); }
    const { bunny_video_id: videoId, tus: t } = started;
    const j = { videoId, cancelled: false, timer: null, tus: null };
    job.current = j;
    j.tus = new tus.Upload(file, {
      endpoint: t.endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000, 60000],
      headers: { AuthorizationSignature: t.signature, AuthorizationExpire: String(t.expires), VideoId: t.videoId, LibraryId: t.libraryId },
      metadata: { filetype: file.type, title: title.trim() },
      onError: (err) => { if (!j.cancelled) { fail(`The upload stopped: ${err.message || 'connection problem'}. Try again.`); } },
      onProgress: (sent, total) => setPercent(Math.round((sent / total) * 100)),
      onSuccess: () => { if (j.cancelled) return; setPhase('processing'); setPercent(0); setNote('Uploaded. Bunny is preparing the video…'); poll(videoId); },
    });
    j.tus.start();
  }

  function cancel() {
    const j = job.current;
    if (!j) return;
    j.cancelled = true; clearTimeout(j.timer);
    j.tus?.abort(true).catch(() => {});
    job.current = null;
    setPhase('idle'); setNote(''); setPercent(0);
  }

  return (
    <>
      <button type="button" className="mini-chip upload-chip" disabled={busy} onClick={() => pick.current?.click()} title={replacing ? 'Upload a new video file to replace this one' : 'Upload the video file from your computer'}>
        <HugeiconsIcon icon={Upload04Icon} size={13} strokeWidth={1.6} /> {replacing ? 'Replace file' : 'Upload video'}
      </button>
      <input ref={pick} type="file" accept="video/*,.mkv" hidden aria-label={`${label}: choose the video file`} onChange={(e) => start(e.target.files[0])} />
    </>
  );
}

/** the progress of an upload, shown under the video's row */
export function UploadStatus({ job }) {
  if (!job || job.phase === 'idle') return null;
  const { phase, percent, note, cancel } = job;
  const busy = phase === 'sending' || phase === 'processing';
  return (
    <div className={`video-upload ${phase}`} role="status" aria-live="polite">
      {busy && (
        <>
          <div className="vu-top">
            <strong>{phase === 'sending' ? `Uploading ${percent}%` : `Processing${percent ? ` ${percent}%` : '…'}`}</strong>
            <button type="button" className="link-btn" onClick={cancel}><HugeiconsIcon icon={Cancel01Icon} size={12} strokeWidth={1.8} /> Cancel</button>
          </div>
          <div className="vu-bar"><span style={{ width: `${percent}%` }} /></div>
          <small className="muted">{note} Keep this page open until it is ready.</small>
        </>
      )}
      {phase === 'done' && <div className="vu-top"><strong><HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} strokeWidth={1.8} /> Ready</strong><span className="muted">Save the course to keep it.</span></div>}
      {phase === 'error' && <div className="vu-top"><strong className="field-error">{note}</strong></div>}
    </div>
  );
}
