import type { SourceAdapter, VideoItem } from '../types';

export const manualSource: SourceAdapter<VideoItem> = {
  name: 'manual',
  normalize: (video) => video.id && video.originalUrl ? video : null,
};

export const loadManualVideos = (videos: VideoItem[]) =>
  videos.map(manualSource.normalize).filter((video): video is VideoItem => video !== null);
