import { useEffect, useRef } from 'react';
import { ArrowUpRight, Play, ShieldCheck, X } from 'lucide-react';
import type { VideoItem } from '../types';
import { WeirdnessMeter } from './WeirdnessMeter';

export function VideoModal({ video, onClose }: { video: VideoItem | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!video) return;
    const previous = document.activeElement as HTMLElement | null;
    document.body.classList.add('modal-open');
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab' && dialogRef.current) {
        const controls = [...dialogRef.current.querySelectorAll<HTMLElement>('button, a[href], iframe')];
        if (!controls.length) return;
        const first = controls[0]; const last = controls.at(-1)!;
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.classList.remove('modal-open');
      previous?.focus();
    };
  }, [video, onClose]);

  if (!video) return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div className="video-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" ref={dialogRef}>
      <header><span>NOW ENTERING THE WORMHOLE</span><button ref={closeRef} type="button" onClick={onClose} aria-label="Close video"><X/></button></header>
      <div className="player">
        {video.embedUrl
          ? <iframe src={video.embedUrl} title={video.title} allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen/>
          : <div className="player-placeholder" style={{ backgroundImage: video.thumbnailUrl ? `url(${video.thumbnailUrl})` : undefined }}>
              <div><Play size={38} fill="currentColor"/><strong>Demo transmission</strong><p>This curated sample has no hosted media. Use the original link or add an approved embed URL.</p></div>
            </div>}
      </div>
      <div className="modal-copy">
        <div><span className="eyebrow">{video.sourceName} · {video.creator}</span><h2 id="modal-title">{video.title}</h2><p>{video.description}</p></div>
        <div className="modal-side"><WeirdnessMeter score={video.absurdScore}/><a className="watch-button" href={video.originalUrl} target="_blank" rel="noreferrer">Open original <ArrowUpRight size={15}/></a></div>
      </div>
      <footer><ShieldCheck size={15}/><span>Embedded from the source. ABSURD.TV does not download, proxy, or rehost video files.</span></footer>
    </div>
  </div>;
}
