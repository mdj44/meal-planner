import { Mapping } from "./types";

/**
 * Abstract interface for local database operations
 * Supports both web (SQLite WASM + FTS5) and native (SQLite + FTS5) implementations
 */
export interface LocalDB {
  init(): Promise<void>;
  get(normalized: string): Promise<Mapping | null>;
  put(m: Mapping): Promise<void>;
  bulkUpsert(rows: Mapping[]): Promise<void>;
  searchFTS(query: string, limit: number): Promise<Mapping[]>;
  nearestI8(queryEmbedding: Int8Array, k: number): Promise<Mapping[]>;
  queueContribution(m: Mapping): Promise<void>;
  flushContributions(): Promise<void>;
}

/**
 * No-op implementation for development/testing
 * All methods are stubs that do nothing
 */
export class LocalDBNoop implements LocalDB {
  async init() {}
  async get(_n: string) { return null; }
  async put(_m: Mapping) {}
  async bulkUpsert(_r: Mapping[]) {}
  async searchFTS(_q: string, _l: number) { return []; }
  async nearestI8(_e: Int8Array, _k: number) { return []; }
  async queueContribution(_m: Mapping) {}
  async flushContributions() {}
}
