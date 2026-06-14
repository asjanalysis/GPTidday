import type { SourceAdapter, VideoItem } from '../types';

export type RedditPost = {
  id: string; title: string; permalink?: string; url?: string; author?: string;
  thumbnail?: string; created_utc?: number; over_18?: boolean; selftext?: string;
  media?: { reddit_video?: { fallback_url?: string; duration?: number } };
};

export const redditSource: SourceAdapter<RedditPost> = {
  name: 'reddit',
  normalize: (post) => {
    const originalUrl = post.permalink ? `https://www.reddit.com${post.permalink}` : post.url;
    if (!post.id || !originalUrl) return null;
    return {
      id: `reddit-${post.id}`, title: post.title, description: post.selftext?.slice(0, 220),
      platform: 'reddit', sourceName: 'Reddit', creator: post.author ? `u/${post.author}` : undefined,
      originalUrl, thumbnailUrl: post.thumbnail?.startsWith('http') ? post.thumbnail : undefined,
      duration: post.media?.reddit_video?.duration ? `${post.media.reddit_video.duration}s` : undefined,
      publishedAt: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : undefined,
      tags: ['reddit'], categories: ['WTF'], funnyScore: 60, wtfScore: 70, absurdScore: 65,
      freshnessScore: 80, overallScore: 68, matureAudience: post.over_18,
      moderationFlags: post.over_18 ? ['requires-manual-review'] : [],
    };
  },
};

export const normalizeRedditListing = (payload: unknown): VideoItem[] => {
  const children = (payload as { data?: { children?: { data?: RedditPost }[] } })?.data?.children ?? [];
  return children.map(({ data }) => data && redditSource.normalize(data)).filter((item): item is VideoItem => Boolean(item));
};
