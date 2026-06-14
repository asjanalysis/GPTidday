import type { VideoItem } from '../types';

const artwork = {
  'office-orbit': ['#ff3eb5', '#1b1733', 'MEETING', 'ESCAPED'],
  'symbolic-door': ['#c8ff18', '#15261f', 'DOOR', 'SAYS NO'],
  'pigeon-board': ['#18e0e8', '#25212c', 'Q4', 'BREAD'],
  'cowboy-printer': ['#ff6b23', '#2d1b15', 'PAPER', 'JAM'],
  'soup-weather': ['#ffd45c', '#342018', '100%', 'SOUP'],
  'render-goose': ['#b58cff', '#171c31', 'MESH', 'MISSING'],
  'human-buffering': ['#ff3eb5', '#241726', '12%', 'LOADING'],
  'fish-lecture': ['#18e0e8', '#102733', 'NEEDS', 'WORK'],
  'moon-terms': ['#d9d4ff', '#171526', 'ACCEPT', 'TIDES'],
} satisfies Record<string, [string, string, string, string]>;

const art = (seed: keyof typeof artwork) => {
  const [accent, background, topLine, bottomLine] = artwork[seed];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 560">
    <rect width="900" height="560" fill="${background}"/>
    <path d="M0 80h900M0 180h900M0 280h900M0 380h900M0 480h900" stroke="${accent}" stroke-opacity=".12" stroke-width="2"/>
    <circle cx="710" cy="150" r="210" fill="${accent}" fill-opacity=".14"/>
    <circle cx="710" cy="150" r="118" fill="none" stroke="${accent}" stroke-width="18"/>
    <path d="M640 150h140M710 80v140" stroke="${accent}" stroke-width="18"/>
    <text x="58" y="345" fill="#f7f3e8" font-family="Arial Black, sans-serif" font-size="106" letter-spacing="-7">${topLine}</text>
    <text x="58" y="455" fill="${accent}" font-family="Arial Black, sans-serif" font-size="106" letter-spacing="-7">${bottomLine}</text>
    <text x="62" y="74" fill="#f7f3e8" fill-opacity=".55" font-family="monospace" font-size="18">ABSURD.TV // LOCAL TRANSMISSION</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export const curatedVideos: VideoItem[] = [
  {
    id: 'manual-office-orbit', title: 'The Office Chair Has Entered Orbit',
    description: 'A completely normal quarterly meeting develops its own weather system.',
    platform: 'manual', sourceName: 'ABSURD.TV Demo Reel', creator: 'Department of Unclear Objectives',
    originalUrl: 'https://example.com/videos/office-chair-orbit', thumbnailUrl: art('office-orbit'),
    duration: '0:42', publishedAt: '2026-06-10', tags: ['office', 'zero gravity', 'bad meeting'],
    categories: ['Funny', 'Absurd', 'Staff Picks', 'Fresh'], funnyScore: 91, wtfScore: 76, absurdScore: 94, freshnessScore: 97, overallScore: 93,
  },
  {
    id: 'youtube-dQw4w9WgXcQ', title: 'A Door That Refuses To Be Symbolic',
    description: 'Demo metadata showing a platform-approved YouTube embed flow. The title and art are intentionally fictional.',
    platform: 'youtube', sourceName: 'YouTube', creator: 'Placeholder Channel',
    originalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    thumbnailUrl: art('symbolic-door'), duration: '3:33', publishedAt: '2026-05-28',
    tags: ['door', 'conceptual', 'demo'], categories: ['Abstract', 'Surreal'], funnyScore: 62, wtfScore: 85, absurdScore: 88, freshnessScore: 83, overallScore: 86,
  },
  {
    id: 'manual-pigeon-board', title: 'Pigeon Gives a Hostile Board Presentation',
    description: 'Slide seven is just a breadcrumb. The shareholders are furious.',
    platform: 'manual', sourceName: 'Field Tape Archive', creator: 'Municipal Bird Unit',
    originalUrl: 'https://example.com/videos/pigeon-boardroom', thumbnailUrl: art('pigeon-board'),
    duration: '1:08', publishedAt: '2026-06-06', tags: ['pigeon', 'business', 'powerpoint'],
    categories: ['Funny', 'WTF', 'Staff Picks'], funnyScore: 96, wtfScore: 81, absurdScore: 90, freshnessScore: 91, overallScore: 95,
  },
  {
    id: 'manual-cowboy-printer', title: 'Cowboy Printer Troubleshooting (1999)',
    description: 'A forgotten instructional tape where every paper jam is settled at high noon.',
    platform: 'manual', sourceName: 'Basement VHS Index', creator: 'Unknown Training Consortium',
    originalUrl: 'https://example.com/videos/cowboy-printer', thumbnailUrl: art('cowboy-printer'),
    duration: '4:20', publishedAt: '1999-08-13', tags: ['vhs', 'printer', 'training tape'],
    categories: ['Internet Relic', 'Cringe', 'Deep Weird'], funnyScore: 84, wtfScore: 73, absurdScore: 86, freshnessScore: 12, overallScore: 89,
    matureAudience: true,
  },
  {
    id: 'manual-soup-weather', title: 'Local Forecast: Mostly Soup',
    description: 'The green-screen map has become bisque. Meteorology may never recover.',
    platform: 'manual', sourceName: 'Signal Leak', creator: 'Channel ∅',
    originalUrl: 'https://example.com/videos/soup-weather', thumbnailUrl: art('soup-weather'),
    duration: '0:57', publishedAt: '2026-06-12', tags: ['weather', 'soup', 'broadcast'],
    categories: ['WTF', 'Surreal', 'Fresh'], funnyScore: 79, wtfScore: 97, absurdScore: 95, freshnessScore: 99, overallScore: 96,
  },
  {
    id: 'manual-render-goose', title: 'Unfinished 3D Goose Knows Your Password',
    description: 'A low-poly emissary arrives from a rendering error and asks one very specific question.',
    platform: 'manual', sourceName: 'Render Accident Weekly', creator: 'mesh_missing',
    originalUrl: 'https://example.com/videos/password-goose', thumbnailUrl: art('render-goose'),
    duration: '2:11', publishedAt: '2026-04-19', tags: ['3d', 'goose', 'liminal'],
    categories: ['Animation', 'Surreal', 'Deep Weird'], funnyScore: 72, wtfScore: 93, absurdScore: 98, freshnessScore: 76, overallScore: 94,
  },
  {
    id: 'manual-human-loading', title: 'Human Buffering at the Worst Possible Time',
    description: 'A graceful social interaction reaches 12% and stays there.',
    platform: 'manual', sourceName: 'Cringe Observatory', creator: 'Social Codec Lab',
    originalUrl: 'https://example.com/videos/human-buffering', thumbnailUrl: art('human-buffering'),
    duration: '0:31', publishedAt: '2026-05-17', tags: ['awkward', 'buffering', 'social'],
    categories: ['Cringe', 'Funny'], funnyScore: 88, wtfScore: 64, absurdScore: 69, freshnessScore: 79, overallScore: 82,
    matureAudience: true,
  },
  {
    id: 'manual-fish-lecture', title: 'The Fish Has Notes on Your Performance',
    description: 'An abstract animation about workplace feedback, maritime authority, and one judgmental bass.',
    platform: 'manual', sourceName: 'Independent Animation Feed', creator: 'Soft Emergency Studio',
    originalUrl: 'https://example.com/videos/fish-performance', thumbnailUrl: art('fish-lecture'),
    duration: '1:44', publishedAt: '2026-03-03', tags: ['animation', 'fish', 'performance review'],
    categories: ['Animation', 'Abstract', 'Absurd'], funnyScore: 77, wtfScore: 78, absurdScore: 91, freshnessScore: 68, overallScore: 87,
  },
  {
    id: 'manual-moon-terms', title: 'The Moon Updates Its Terms of Service',
    description: 'You have 900 pages to review before the next tide.',
    platform: 'manual', sourceName: 'Night Internet Public Access', creator: 'Orbital Legal',
    originalUrl: 'https://example.com/videos/moon-terms', thumbnailUrl: art('moon-terms'),
    duration: '5:02', publishedAt: '2024-10-31', tags: ['moon', 'legal', 'terms of service'],
    categories: ['Deep Weird', 'Abstract', 'Internet Relic'], funnyScore: 68, wtfScore: 88, absurdScore: 96, freshnessScore: 35, overallScore: 90,
  },
];
