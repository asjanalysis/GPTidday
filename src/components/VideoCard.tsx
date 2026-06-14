import { ArrowUpRight, Clock3, Play, ShieldCheck } from 'lucide-react';
import type { VideoItem } from '../types';
import { formatDate } from '../utils/video';
import { WeirdnessMeter } from './WeirdnessMeter';

export function VideoCard({ video, onWatch, feature = false }: { video: VideoItem; onWatch: (video: VideoItem) => void; feature?: boolean }) {
  return <article className={`video-card ${feature ? 'video-card-feature' : ''}`}>
    <button className="thumbnail" type="button" onClick={() => onWatch(video)} aria-label={`Watch ${video.title}`}>
      {video.thumbnailUrl && <img src={video.thumbnailUrl} alt="" loading="lazy"/>}
      <span className="thumbnail-noise"/>
      <span className="platform">{video.platform === 'manual' ? 'CURATED' : video.platform.toUpperCase()}</span>
      {video.duration && <span className="duration"><Clock3 size={12}/>{video.duration}</span>}
      <span className="play-button"><Play size={20} fill="currentColor"/></span>
    </button>
    <div className="card-content">
      <div className="card-kicker">
        <span>{video.sourceName}</span><span className="separator">✦</span><span>{formatDate(video.publishedAt)}</span>
      </div>
      <h3>{video.title}</h3>
      <p>{video.description}</p>
      <div className="creator">{video.creator ?? 'Anonymous internet entity'}</div>
      <div className="tags">{video.tags.slice(0, 3).map((tag, index) => <span className={`tag tag-${index % 3}`} key={tag}>#{tag}</span>)}</div>
      <WeirdnessMeter score={video.absurdScore}/>
      <div className="card-footer">
        <button className="watch-button" type="button" onClick={() => onWatch(video)}><Play size={15} fill="currentColor"/> Watch</button>
        <a href={video.originalUrl} target="_blank" rel="noreferrer">Open original <ArrowUpRight size={14}/></a>
        {video.matureAudience && <span className="mature-badge" title="Mature humor, reviewed for prohibited content"><ShieldCheck size={12}/> 18+ humor</span>}
      </div>
    </div>
  </article>;
}
