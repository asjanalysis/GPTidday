export type VideoPlatform = 'youtube' | 'vimeo' | 'reddit' | 'tiktok' | 'instagram' | 'manual' | 'other';

export type VideoItem = {
  id: string;
  title: string;
  description?: string;
  platform: VideoPlatform;
  sourceName: string;
  creator?: string;
  originalUrl: string;
  embedUrl?: string;
  thumbnailUrl?: string;
  duration?: string;
  publishedAt?: string;
  tags: string[];
  categories: string[];
  funnyScore: number;
  wtfScore: number;
  absurdScore: number;
  freshnessScore: number;
  overallScore: number;
  matureAudience?: boolean;
  moderationFlags?: string[];
};

export type SortOption = 'Newest' | 'Weirdest' | 'Most Funny' | 'Most WTF' | 'Random';
export type SourceAdapter<T> = { name: string; normalize: (input: T) => VideoItem | null };
