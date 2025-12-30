function normalize(base: string | undefined | null): string {
  if (!base) return "";
  return base.replace(/\s+/g, "").replace(/\/+$/, "");
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

export function getApiBases(): string[] {
  const envBase = normalize((import.meta as any)?.env?.VITE_API_BASE);
  const windowBase = typeof window !== "undefined" ? normalize((window as any).__apiBase) : "";
  const defaults = ["/.netlify/functions", "/api"];
  return unique([envBase, windowBase, ...defaults].filter(Boolean));
}

export function buildApiUrls(path: string): string[] {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return getApiBases().map((b) => `${b}${suffix}`);
}

/**
 * Fetches an API endpoint, trying multiple base URLs until one succeeds or a non-fallback status is returned.
 * Falls back on network errors or provided statuses (e.g., 404 if the path is wrong on the current host).
 */
export async function fetchApiWithFallback(path: string, init?: RequestInit, fallbackStatuses: number[] = [404, 0]): Promise<Response> {
  const urls = buildApiUrls(path);
  let lastError: any = null;

  for (const url of urls) {
    try {
      const res = await fetch(url, init);
      if (!res) continue;
      if (fallbackStatuses.includes(res.status)) {
        lastError = new Error(`HTTP ${res.status}`);
        continue;
      }
      return res;
    } catch (err: any) {
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error("Network error");
}
