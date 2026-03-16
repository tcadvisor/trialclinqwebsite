/**
 * Search Cache and Request Manager
 * Implements intelligent caching and request deduplication for clinical trial searches
 */

import type { CtgovResponse, CtgovQuery } from './ctgov';

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

const CACHE_VERSION = 'v2';
const CACHE_KEY_PREFIX = 'tc_search_cache_';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes for fresh results
const STALE_TTL_MS = 30 * 60 * 1000; // 30 minutes for stale-while-revalidate
const MAX_CACHE_ENTRIES = 100;
const MAX_MEMORY_ENTRIES = 50;

// ============================================================================
// TYPES
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  queryHash: string;
}

interface CacheMetadata {
  version: string;
  entries: string[];
  lastCleanup: number;
}

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

// ============================================================================
// IN-MEMORY CACHE (Session-level, faster access)
// ============================================================================

const memoryCache = new Map<string, CacheEntry<CtgovResponse>>();
const pendingRequests = new Map<string, PendingRequest<CtgovResponse>>();

// ============================================================================
// HASH FUNCTION FOR CACHE KEYS
// ============================================================================

/**
 * Create a deterministic hash from a query object
 */
export function hashQuery(query: CtgovQuery): string {
  const normalized = {
    q: (query.q || '').toLowerCase().trim(),
    status: Array.isArray(query.status)
      ? query.status.map(s => s.toLowerCase()).sort().join(',')
      : (query.status || '').toLowerCase(),
    type: (query.type || '').toLowerCase(),
    loc: (query.loc || '').toLowerCase().trim(),
    lat: query.lat !== undefined ? query.lat.toFixed(4) : '',
    lng: query.lng !== undefined ? query.lng.toFixed(4) : '',
    radius: (query.radius || '').toLowerCase(),
    pageSize: query.pageSize || 12,
    pageToken: query.pageToken || '',
  };

  // Simple but effective hash for our purposes
  const str = JSON.stringify(normalized);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `${CACHE_KEY_PREFIX}${CACHE_VERSION}_${Math.abs(hash).toString(36)}`;
}

// ============================================================================
// LOCAL STORAGE CACHE
// ============================================================================

function getStorageMetadata(): CacheMetadata {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}metadata`);
    if (raw) {
      const meta = JSON.parse(raw) as CacheMetadata;
      if (meta.version === CACHE_VERSION) {
        return meta;
      }
    }
  } catch {}
  return { version: CACHE_VERSION, entries: [], lastCleanup: Date.now() };
}

function saveStorageMetadata(meta: CacheMetadata): void {
  try {
    localStorage.setItem(`${CACHE_KEY_PREFIX}metadata`, JSON.stringify(meta));
  } catch {}
}

function cleanupOldEntries(): void {
  const meta = getStorageMetadata();
  const now = Date.now();

  // Only cleanup every 5 minutes
  if (now - meta.lastCleanup < 5 * 60 * 1000) return;

  const validEntries: string[] = [];

  for (const key of meta.entries) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const entry = JSON.parse(raw) as CacheEntry<CtgovResponse>;
        if (now - entry.timestamp < STALE_TTL_MS) {
          validEntries.push(key);
        } else {
          localStorage.removeItem(key);
        }
      }
    } catch {
      localStorage.removeItem(key);
    }
  }

  // If still too many, remove oldest
  while (validEntries.length > MAX_CACHE_ENTRIES) {
    const oldest = validEntries.shift();
    if (oldest) {
      localStorage.removeItem(oldest);
    }
  }

  meta.entries = validEntries;
  meta.lastCleanup = now;
  saveStorageMetadata(meta);
}

function getFromStorage(key: string): CacheEntry<CtgovResponse> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const entry = JSON.parse(raw) as CacheEntry<CtgovResponse>;
    return entry;
  } catch {
    return null;
  }
}

function saveToStorage(key: string, data: CtgovResponse): void {
  try {
    const entry: CacheEntry<CtgovResponse> = {
      data,
      timestamp: Date.now(),
      queryHash: key,
    };

    localStorage.setItem(key, JSON.stringify(entry));

    // Update metadata
    const meta = getStorageMetadata();
    if (!meta.entries.includes(key)) {
      meta.entries.push(key);
      saveStorageMetadata(meta);
    }

    // Trigger cleanup if needed
    cleanupOldEntries();
  } catch {
    // Storage full or unavailable - silently fail
  }
}

// ============================================================================
// MEMORY CACHE
// ============================================================================

function getFromMemory(key: string): CacheEntry<CtgovResponse> | null {
  return memoryCache.get(key) || null;
}

function saveToMemory(key: string, data: CtgovResponse): void {
  const entry: CacheEntry<CtgovResponse> = {
    data,
    timestamp: Date.now(),
    queryHash: key,
  };

  memoryCache.set(key, entry);

  // Evict oldest if too many entries
  if (memoryCache.size > MAX_MEMORY_ENTRIES) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [k, v] of memoryCache) {
      if (v.timestamp < oldestTime) {
        oldestTime = v.timestamp;
        oldestKey = k;
      }
    }

    if (oldestKey) {
      memoryCache.delete(oldestKey);
    }
  }
}

// ============================================================================
// CACHE RETRIEVAL WITH FRESHNESS CHECK
// ============================================================================

export interface CacheResult<T> {
  data: T | null;
  isFresh: boolean;
  isStale: boolean;
  age: number;
}

/**
 * Get cached data with freshness information
 */
export function getCachedSearch(query: CtgovQuery): CacheResult<CtgovResponse> {
  const key = hashQuery(query);
  const now = Date.now();

  // Check memory first (faster)
  let entry = getFromMemory(key);

  // Fall back to localStorage
  if (!entry) {
    entry = getFromStorage(key);
    // Promote to memory cache if found
    if (entry) {
      memoryCache.set(key, entry);
    }
  }

  if (!entry) {
    return { data: null, isFresh: false, isStale: false, age: 0 };
  }

  const age = now - entry.timestamp;
  const isFresh = age < CACHE_TTL_MS;
  const isStale = !isFresh && age < STALE_TTL_MS;

  return {
    data: entry.data,
    isFresh,
    isStale,
    age,
  };
}

/**
 * Save search results to cache
 */
export function cacheSearchResults(query: CtgovQuery, data: CtgovResponse): void {
  const key = hashQuery(query);
  saveToMemory(key, data);
  saveToStorage(key, data);
}

// ============================================================================
// REQUEST DEDUPLICATION
// ============================================================================

/**
 * Check if there's already a pending request for this query
 */
export function getPendingRequest(query: CtgovQuery): Promise<CtgovResponse> | null {
  const key = hashQuery(query);
  const pending = pendingRequests.get(key);

  if (pending) {
    // Check if the pending request is recent (within 30 seconds)
    if (Date.now() - pending.timestamp < 30000) {
      return pending.promise;
    }
    // Old pending request, clean it up
    pendingRequests.delete(key);
  }

  return null;
}

/**
 * Register a pending request for deduplication
 */
export function setPendingRequest(query: CtgovQuery, promise: Promise<CtgovResponse>): void {
  const key = hashQuery(query);
  pendingRequests.set(key, {
    promise,
    timestamp: Date.now(),
  });

  // Clean up when resolved
  promise.finally(() => {
    pendingRequests.delete(key);
  });
}

// ============================================================================
// SMART FETCH WITH CACHING
// ============================================================================

/**
 * Fetch studies with intelligent caching and request deduplication
 */
export async function cachedFetchStudies(
  query: CtgovQuery,
  fetchFn: (q: CtgovQuery) => Promise<CtgovResponse>,
  options?: {
    forceRefresh?: boolean;
    staleWhileRevalidate?: boolean;
  }
): Promise<CtgovResponse> {
  const { forceRefresh = false, staleWhileRevalidate = true } = options || {};

  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = getCachedSearch(query);

    // Return fresh cache immediately
    if (cached.isFresh && cached.data) {
      return cached.data;
    }

    // For stale data, return immediately but trigger revalidation
    if (staleWhileRevalidate && cached.isStale && cached.data) {
      // Fire off background revalidation
      const revalidate = async () => {
        try {
          const fresh = await fetchFn(query);
          cacheSearchResults(query, fresh);
        } catch {
          // Silently fail background refresh
        }
      };
      revalidate();

      return cached.data;
    }
  }

  // Check for pending request
  const pending = getPendingRequest(query);
  if (pending) {
    return pending;
  }

  // Make fresh request
  const promise = fetchFn(query).then((data) => {
    cacheSearchResults(query, data);
    return data;
  });

  setPendingRequest(query, promise);

  return promise;
}

// ============================================================================
// CACHE UTILITIES
// ============================================================================

/**
 * Clear all search caches
 */
export function clearSearchCache(): void {
  // Clear memory cache
  memoryCache.clear();
  pendingRequests.clear();

  // Clear localStorage cache
  const meta = getStorageMetadata();
  for (const key of meta.entries) {
    localStorage.removeItem(key);
  }
  localStorage.removeItem(`${CACHE_KEY_PREFIX}metadata`);
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  memoryEntries: number;
  storageEntries: number;
  pendingRequests: number;
} {
  const meta = getStorageMetadata();
  return {
    memoryEntries: memoryCache.size,
    storageEntries: meta.entries.length,
    pendingRequests: pendingRequests.size,
  };
}

/**
 * Prefetch common searches to warm the cache
 */
export async function prefetchCommonSearches(
  fetchFn: (q: CtgovQuery) => Promise<CtgovResponse>,
  commonConditions: string[] = ['breast cancer', 'lung cancer', 'diabetes', 'heart failure']
): Promise<void> {
  // Only prefetch if we have few cached entries
  const stats = getCacheStats();
  if (stats.memoryEntries > 10) return;

  // Prefetch in background without blocking
  for (const condition of commonConditions.slice(0, 4)) {
    const query: CtgovQuery = {
      q: condition,
      status: 'RECRUITING',
      pageSize: 12,
    };

    // Skip if already cached
    const cached = getCachedSearch(query);
    if (cached.data) continue;

    try {
      await cachedFetchStudies(query, fetchFn);
    } catch {
      // Silently fail prefetch
    }

    // Small delay between prefetches to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}
