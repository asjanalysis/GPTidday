import type { SourceAdapter, VideoItem } from '../types';

export type YouTubeInput = {
  videoId: string; title: string; description?: string; creator?: string; thumbnailUrl?: string;
  tags?: string[]; categories?: string[]; publishedAt?: string; duration?: string;
  scores?: Partial<Pick<VideoItem, 'funnyScore' | 'wtfScore' | 'absurdScore' | 'freshnessScore' | 'overallScore'>>;
};

export const youtubeSource: SourceAdapter<YouTubeInput> = {
  name: 'youtube',
  normalize: (input) => {
    if (!/^[\w-]{11}$/.test(input.videoId)) return null;
    const scores = input.scores ?? {};
    return {
      id: `youtube-${input.videoId}`, title: input.title, description: input.description,
      platform: 'youtube', sourceName: 'YouTube', creator: input.creator,
      originalUrl: `https://www.youtube.com/watch?v=${input.videoId}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${input.videoId}`,
      thumbnailUrl: input.thumbnailUrl ?? `https://i.ytimg.com/vi/${input.videoId}/hqdefault.jpg`,
      duration: input.duration, publishedAt: input.publishedAt, tags: input.tags ?? [],
      categories: input.categories ?? ['Funny'], funnyScore: scores.funnyScore ?? 50,
      wtfScore: scores.wtfScore ?? 50, absurdScore: scores.absurdScore ?? 50,
      freshnessScore: scores.freshnessScore ?? 50, overallScore: scores.overallScore ?? 50,
    };
  },
};
