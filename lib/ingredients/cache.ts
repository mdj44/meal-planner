import { Mapping } from "./types";

/**
 * Offline-first ingredient lookup with local cache priority
 * @param _normalized - Normalized ingredient name
 * @returns Promise resolving to Mapping or null if not found
 */
export async function lookupLocal(_normalized: string): Promise<Mapping | null> {
  // Stub: In real implementation, this would:
  // 1. Check local SQLite/IndexedDB cache first
  // 2. Try exact match, then synonym match, then FTS5 fuzzy search
  // 3. Optionally try vector similarity search
  return null;
}

/**
 * Remote ingredient lookup (only when online)
 * @param _normalized - Normalized ingredient name
 * @returns Promise resolving to Mapping or null if not found
 */
export async function lookupRemote(_normalized: string): Promise<Mapping | null> {
  // Stub: In real implementation, this would:
  // 1. Check if online
  // 2. Query Supabase ingredient_catalog table
  // 3. Try AI classification if unknown
  // 4. Cache result locally before returning
  return null;
}

/**
 * Cache mapping locally for offline access
 * @param _m - Mapping to cache
 */
export async function cacheLocal(_m: Mapping): Promise<void> {
  // Stub: In real implementation, this would:
  // 1. Store in local SQLite/IndexedDB
  // 2. Update FTS5 index
  // 3. Store vector embedding if available
}

/**
 * Queue contribution for later sync when online
 * @param _m - Mapping contribution to queue
 */
export async function submitContribution(_m: Mapping): Promise<void> {
  // Stub: In real implementation, this would:
  // 1. Store in local contributions queue
  // 2. Mark for sync when connection returns
  // 3. Include metadata like store_id, chain_id, confidence
}

/**
 * Offline-first classification flow:
 * 1. normalizeName(name)
 * 2. try lookupLocal(); if null and online, try lookupRemote()
 * 3. if still unknown:
 *    - if online: call model once, then cacheLocal() + submitContribution()
 *    - if offline: mark "Unclassified (offline)" and let user tag manually
 * 4. Tags and classifications queue offline, sync later
 */
