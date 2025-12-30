function buildFunctionUrlFallbacks(url: string): string[] {
  const urls = [url];
  if (url.includes("/.netlify/functions/")) {
    urls.push(url.replace("/.netlify/functions/", "/api/"));
  } else if (url.includes("/api/")) {
    urls.push(url.replace("/api/", "/.netlify/functions/"));
  }
  return Array.from(new Set(urls));
}

export async function fetchFunctionWithFallback(url: string, init: RequestInit, timeoutMs = 120_000): Promise<Response> {
  const urls = buildFunctionUrlFallbacks(url);
  let lastError: any = null;

  for (const u of urls) {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      try { controller.abort(); } catch {}
    }, timeoutMs);
    try {
      const res = await fetch(u, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (!res) continue;
      return res;
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error("Network error");
}
