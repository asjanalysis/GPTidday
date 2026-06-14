export const sourceConfig = {
  allowlist: ['youtube.com', 'youtu.be', 'youtube-nocookie.com', 'vimeo.com', 'player.vimeo.com', 'reddit.com', 'www.reddit.com', 'example.com'],
  blocklist: [] as string[],
  youtube: {
    enabled: true,
    apiKeyEnvironmentVariable: 'VITE_YOUTUBE_API_KEY',
    note: 'The MVP uses manually curated IDs. Keep API keys out of client code for production; use a small server-side proxy.',
  },
  reddit: {
    enabled: false,
    feeds: [] as string[],
    note: 'Enable only for moderator-reviewed public feeds. Respect Reddit API terms and rate limits.',
  },
  oEmbed: {
    enabled: false,
    endpoints: [] as string[],
    note: 'Call provider oEmbed endpoints from a controlled backend when CORS or credentials require it.',
  },
} as const;
