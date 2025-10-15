export async function safeFetch(input: RequestInfo, init?: RequestInit, timeoutMs = 15000): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const merged = { ...(init || {}), signal: controller.signal } as RequestInit;
    const res = await fetch(input, merged);
    clearTimeout(id);
    return res;
  } catch (e) {
    return null;
  }
}
