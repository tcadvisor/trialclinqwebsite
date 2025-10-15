export async function safeFetch(input: RequestInfo, init?: RequestInit, timeoutMs = 15000): Promise<Response | null> {
  const controller = new AbortController();
  let externalSignal: AbortSignal | undefined;
  let onExtAbort: (() => void) | undefined;
  try {
    if (init && (init as any).signal) {
      externalSignal = (init as any).signal as AbortSignal;
      if (externalSignal.aborted) controller.abort();
      else {
        onExtAbort = () => controller.abort();
        externalSignal.addEventListener('abort', onExtAbort);
      }
    }
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const merged = { ...(init || {}), signal: controller.signal } as RequestInit;
    const res = await fetch(input, merged);
    clearTimeout(id);
    return res;
  } catch (e) {
    return null;
  } finally {
    if (externalSignal && onExtAbort) {
      try { externalSignal.removeEventListener('abort', onExtAbort); } catch {}
    }
  }
}
