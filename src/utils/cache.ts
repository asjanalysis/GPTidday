type CacheEntry<T> = { value: T; expires: number };

export async function cachedFetch<T>(key: string, ttlMs: number, loader: () => Promise<T>, force = false, isValid?: (value: unknown) => value is T): Promise<T> {
  if (!force) {
    try {
      const raw = localStorage.getItem(`capitola:${key}`);
      if (raw) {
        const entry = JSON.parse(raw) as CacheEntry<unknown>;
        if (entry.expires > Date.now() && (!isValid || isValid(entry.value))) return entry.value as T;
        localStorage.removeItem(`capitola:${key}`);
      }
    } catch { /* Local storage may be unavailable. */ }
  }
  const value = await loader();
  try { localStorage.setItem(`capitola:${key}`, JSON.stringify({ value, expires: Date.now() + ttlMs })); } catch { /* Ignore quota/privacy mode. */ }
  return value;
}

export function sourceUrl(url: string) {
  const proxy = import.meta.env.VITE_PROXY_BASE as string | undefined;
  return proxy ? `${proxy}?url=${encodeURIComponent(url)}` : url;
}

export async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(sourceUrl(url), { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json() as Promise<T>;
}

export async function fetchText(url: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch(sourceUrl(url), { signal });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}
