import type { SortOption, VideoItem } from '../types';

export const categories = ['All', 'Funny', 'WTF', 'Absurd', 'Abstract', 'Animation', 'Cringe', 'Surreal', 'Internet Relic', 'Staff Picks', 'Fresh', 'Deep Weird'];

export function searchVideos(videos: VideoItem[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return videos;
  return videos.filter((video) => [
    video.title, video.description, video.creator, video.sourceName, ...video.tags, ...video.categories,
  ].filter(Boolean).join(' ').toLowerCase().includes(needle));
}

export function sortVideos(videos: VideoItem[], sort: SortOption, randomOrder: string[] = []) {
  return [...videos].sort((a, b) => {
    if (sort === 'Newest') return Date.parse(b.publishedAt ?? '1970-01-01') - Date.parse(a.publishedAt ?? '1970-01-01');
    if (sort === 'Weirdest') return b.absurdScore - a.absurdScore;
    if (sort === 'Most Funny') return b.funnyScore - a.funnyScore;
    if (sort === 'Most WTF') return b.wtfScore - a.wtfScore;
    return randomOrder.indexOf(a.id) - randomOrder.indexOf(b.id);
  });
}

export const formatDate = (date?: string) => date
  ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date))
  : 'Date unknown';
