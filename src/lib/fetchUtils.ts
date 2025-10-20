export async function safeFetch(input: RequestInfo, init?: RequestInit, timeoutMs = 15000): Promise<Response | null> {
  const controller = new AbortController();
  let externalSignal: AbortSignal | undefined;
  let onExtAbort: (() => void) | undefined;
  let timeoutId: NodeJS.Timeout | undefined;
  try {
    if (init && (init as any).signal) {
      externalSignal = (init as any).signal as AbortSignal;
      if (externalSignal.aborted) controller.abort();
      else {
        onExtAbort = () => controller.abort();
        externalSignal.addEventListener('abort', onExtAbort);
      }
    }
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const merged = { ...(init || {}), signal: controller.signal } as RequestInit;
    const res = await fetch(input, merged);
    if (timeoutId) clearTimeout(timeoutId);
    return res;
  } catch (e) {
    // Return null on any error (timeout, network, abort, etc)
    return null;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (externalSignal && onExtAbort) {
      try { externalSignal.removeEventListener('abort', onExtAbort); } catch {}
    }
  }
}
