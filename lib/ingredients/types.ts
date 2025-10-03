export type MappingSource = "manual" | "crowd" | "vector" | "llm";

export interface Mapping {
  normalized_name: string;
  display_name?: string | null;
  dept?: string | null;
  zone?: string | null;
  confidence?: number | null;
  source?: MappingSource;
  store_id?: string | null;
  chain_id?: string | null;
  updated_at?: string;
  embedding_i8?: Int8Array | null;
  synonyms?: string[] | null;
}
