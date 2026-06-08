const ALLOWED_HOSTS = new Set(['api.weather.gov', 'api.tidesandcurrents.noaa.gov', 'www.ndbc.noaa.gov', 'marine-api.open-meteo.com', 'marine.weather.gov', 'cityofcapitola.gov', 'www.cityofcapitola.gov', 'cityofcapitola.org', 'www.cityofcapitola.org']);

export default async (request: Request) => {
  const raw = new URL(request.url).searchParams.get('url');
  if (!raw) return Response.json({ error: 'Missing url parameter' }, { status: 400 });
  let target: URL;
  try { target = new URL(raw); } catch { return Response.json({ error: 'Invalid URL' }, { status: 400 }); }
  if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname)) return Response.json({ error: 'Host is not allowlisted' }, { status: 403 });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const upstream = await fetch(target, { signal: controller.signal, headers: { 'User-Agent': 'capitola-conditions/1.0 public-dashboard' } });
    return new Response(await upstream.text(), { status: upstream.status, headers: { 'Content-Type': upstream.headers.get('content-type') ?? 'text/plain; charset=utf-8', 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800', 'Access-Control-Allow-Origin': '*' } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Upstream request failed' }, { status: 502 });
  } finally { clearTimeout(timeout); }
};
