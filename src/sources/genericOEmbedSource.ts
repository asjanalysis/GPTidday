import type { SourceAdapter, VideoPlatform } from '../types';

export type OEmbedInput = {
  sourceUrl: string; provider_name?: string; title?: string; author_name?: string;
  thumbnail_url?: string; html?: string; platform?: VideoPlatform;
};

export const genericOEmbedSource: SourceAdapter<OEmbedInput> = {
  name: 'oembed',
  normalize: (input) => {
    if (!input.sourceUrl || !input.title) return null;
    const id = `oembed-${btoa(input.sourceUrl).replace(/[^a-z0-9]/gi, '').slice(0, 18)}`;
    return {
      id, title: input.title, platform: input.platform ?? 'other',
      sourceName: input.provider_name ?? 'oEmbed provider', creator: input.author_name,
      originalUrl: input.sourceUrl, thumbnailUrl: input.thumbnail_url,
      tags: ['oembed'], categories: ['Funny'], funnyScore: 50, wtfScore: 50,
      absurdScore: 50, freshnessScore: 50, overallScore: 50,
    };
  },
};

export async function fetchOEmbed(endpoint: string, sourceUrl: string, signal?: AbortSignal) {
  const url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}url=${encodeURIComponent(sourceUrl)}&format=json`;
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`oEmbed request failed (${response.status})`);
  return genericOEmbedSource.normalize({ ...(await response.json() as Omit<OEmbedInput, 'sourceUrl'>), sourceUrl });
}
