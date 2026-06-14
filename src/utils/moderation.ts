import { sourceConfig } from '../config/sources';
import type { VideoItem } from '../types';

export const blockedKeywords = [
  'porn', 'explicit sex', 'sexualized minor', 'child sexual', 'graphic gore', 'beheading',
  'white supremacy', 'doxxing', 'home address', 'dangerous challenge',
];
export const blockedTags = ['pornography', 'gore', 'hate', 'extremism', 'doxxing', 'dangerous-challenge', 'minor-adult-context'];
export const hardFlags = ['explicit-sexual', 'graphic-violence', 'hate-extremism', 'doxxing', 'dangerous-challenge', 'minor-adult-context'];

export type ModerationResult = { allowed: boolean; reasons: string[] };

export function moderateVideo(video: VideoItem): ModerationResult {
  const text = [video.title, video.description, video.creator, ...video.tags, ...video.categories].filter(Boolean).join(' ').toLowerCase();
  const reasons = [
    ...blockedKeywords.filter((word) => text.includes(word)).map((word) => `blocked keyword: ${word}`),
    ...blockedTags.filter((tag) => video.tags.map((item) => item.toLowerCase()).includes(tag)).map((tag) => `blocked tag: ${tag}`),
    ...(video.moderationFlags ?? []).filter((flag) => hardFlags.includes(flag)).map((flag) => `moderation flag: ${flag}`),
  ];
  try {
    const host = new URL(video.originalUrl).hostname.replace(/^www\./, '');
    if (sourceConfig.blocklist.some((blocked) => host === blocked || host.endsWith(`.${blocked}`))) reasons.push(`blocked source: ${host}`);
  } catch {
    reasons.push('invalid source URL');
  }
  return { allowed: reasons.length === 0, reasons };
}

export const filterAllowedVideos = (videos: VideoItem[]) => videos.filter((video) => moderateVideo(video).allowed);
