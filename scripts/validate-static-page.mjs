import { readFileSync, existsSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const cssExists = existsSync('styles.css');
const jsExists = existsSync('script.js');
const assetHero = existsSync('assets/scoliosis-care-family-illustration.svg');
const assetScreening = existsSync('assets/scolisnap-screening-illustration.svg');

const checks = [
  ['exactly one H1', (html.match(/<h1[\s>]/g) || []).length === 1],
  ['meta description', /<meta\s+name="description"/.test(html)],
  ['canonical link', /rel="canonical"/.test(html)],
  ['Open Graph title', /property="og:title"/.test(html)],
  ['JSON-LD schema', /application\/ld\+json/.test(html)],
  ['FAQ section', /id="faq"/.test(html) && /FAQPage/.test(html)],
  ['primary CTA', /Start a free case review/.test(html)],
  ['CSS file exists', cssExists],
  ['JS file exists', jsExists],
  ['hero SVG exists', assetHero],
  ['screening SVG exists', assetScreening],
  ['no legacy app mount', !/<div id="app"><\/div>/.test(html)]
];

const failed = checks.filter(([, ok]) => !ok);
for (const [name, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
}

if (failed.length) {
  process.exitCode = 1;
}
