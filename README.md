# ABSURD.TV

ABSURD.TV is a dark, playful, single-page video aggregation experience for curated funny, WTF, absurdist, surreal, abstract, cringe, animation, and internet-culture clips. It is a human-picked rabbit hole rather than a generic engagement feed.

The MVP is a static Vite + React + TypeScript application. It does **not** download, proxy, scrape, or rehost video files. Embeds are created only when a curator supplies a provider-approved embed URL.

## Run locally

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Vite normally serves the app at `http://localhost:5173`.

```bash
npm run typecheck
npm test
npm run lint
npm run build
npm run preview
```

## Architecture

- `src/App.tsx` — feed state, instant search, filters, sorting, random portal, and modal orchestration.
- `src/components/` — logo, cards, weirdness meter, accessible player modal, and error boundary.
- `src/data/curatedVideos.ts` — local curator-owned catalog and easiest place to add a clip.
- `src/config/sources.ts` — source allowlist/blocklist and optional integration settings.
- `src/sources/` — adapters that normalize provider data into the shared `VideoItem`.
- `src/utils/moderation.ts` — rule-based safety gate.
- `src/utils/video.ts` — search, date, and sorting helpers.
- `src/tests/` — lightweight moderation and discovery tests.

## Add a curated video

Add a `VideoItem` to `src/data/curatedVideos.ts`. Required fields include a unique ID, title, platform, source attribution, original URL, tags/categories, and all five curation scores.

```ts
{
  id: 'manual-example',
  title: 'An Accurate but Strange Title',
  platform: 'manual',
  sourceName: 'Curator submission',
  originalUrl: 'https://the-original-provider.example/video',
  embedUrl: 'https://provider-approved-embed.example/video',
  thumbnailUrl: 'https://provider.example/approved-thumbnail.jpg',
  tags: ['surreal', 'animation'],
  categories: ['Surreal', 'Staff Picks'],
  funnyScore: 80,
  wtfScore: 90,
  absurdScore: 95,
  freshnessScore: 70,
  overallScore: 91,
}
```

Omit `embedUrl` when embedding is not explicitly supported. The modal shows the thumbnail and an “Open original” action instead. Never add a ripped direct-media URL.

## Source adapters

Every adapter returns the normalized `VideoItem` shape in `src/types.ts`:

- `manualSource.ts` validates local curator records.
- `youtubeSource.ts` accepts a YouTube ID and creates official watch and privacy-enhanced embed URLs. It can later consume YouTube Data API responses.
- `redditSource.ts` normalizes public Reddit listing records where feasible. It intentionally does not proxy Reddit-hosted media.
- `genericOEmbedSource.ts` handles provider oEmbed metadata. Browser CORS varies, so production calls should normally run through a controlled backend.

Live integrations are disabled by default. For YouTube Data API discovery, `VITE_YOUTUBE_API_KEY` is documented only for local prototyping. In production, keep keys in a server-side function, restrict credentials, cache results, enforce quotas, and return only normalized reviewed records. Reddit and oEmbed integrations should follow the same pattern and current provider terms.

## Moderation and content policy

The moderation gate hides records with blocked keywords, blocked tags, hard moderation flags, invalid URLs, or blocked sources. It blocks explicit sexual content, graphic violence/gore, hate or extremist content, doxxing/private information, dangerous challenges, and mature/adult contexts involving minors.

`matureAudience: true` is only for non-explicit mature humor and displays an “18+ humor” badge. It never bypasses moderation. Client rules are defense in depth, not a substitute for human review; future submission pipelines must moderate on the server before publishing.

## Legal and platform policy

- Attribute every item and link to its original source.
- Use official APIs, RSS, oEmbed, or provider-approved embeds.
- Never bypass DRM, paywalls, authentication, CORS, rate limits, CSP, or embed restrictions.
- Never claim ownership of third-party work or autoplay sound.
- Remove content promptly after a valid rights-holder or safety request.

The included records are labeled UI demonstrations. Their fictional titles and descriptions do not claim a specific real video exists at each sample URL.
