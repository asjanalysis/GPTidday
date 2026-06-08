const ALLOWED_HOSTS = new Set(['api.weather.gov', 'api.tidesandcurrents.noaa.gov', 'www.ndbc.noaa.gov', 'marine-api.open-meteo.com', 'marine.weather.gov', 'cityofcapitola.gov', 'www.cityofcapitola.gov', 'cityofcapitola.org', 'www.cityofcapitola.org']);

type RequestLike = { query: { url?: string | string[] }; method?: string };
type ResponseLike = { status(code: number): ResponseLike; json(body: unknown): void; send(body: string): void; setHeader(name: string, value: string): void };

export default async function handler(request: RequestLike, response: ResponseLike) {
  if (request.method && request.method !== 'GET') return response.status(405).json({ error: 'GET only' });
  const raw = Array.isArray(request.query.url) ? request.query.url[0] : request.query.url;
  if (!raw) return response.status(400).json({ error: 'Missing url parameter' });
  let target: URL;
  try { target = new URL(raw); } catch { return response.status(400).json({ error: 'Invalid URL' }); }
  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname)) return response.status(403).json({ error: 'Host is not allowlisted' });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const upstream = await fetch(target, { signal: controller.signal, headers: { 'User-Agent': 'capitola-conditions/1.0 contact: public-dashboard' } });
    const body = await upstream.text();
    response.setHeader('Content-Type', upstream.headers.get('content-type') ?? 'text/plain; charset=utf-8');
    response.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');
    response.setHeader('Access-Control-Allow-Origin', '*');
    return response.status(upstream.status).send(body);
  } catch (error) {
    return response.status(502).json({ error: error instanceof Error ? error.message : 'Upstream request failed' });
  } finally { clearTimeout(timeout); }
}
