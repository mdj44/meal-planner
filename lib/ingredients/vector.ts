export type EmbeddingF32 = Float32Array;
export type EmbeddingI8 = Int8Array;

/**
 * Quantizes Float32 embeddings to Int8 for efficient storage
 * @param e - Float32Array embedding
 * @param scale - Quantization scale factor (default 127)
 * @returns Int8Array quantized embedding
 */
export function quantizeToInt8(e: EmbeddingF32, scale = 127): EmbeddingI8 {
  const out = new Int8Array(e.length);
  for (let i = 0; i < e.length; i++) {
    let v = Math.max(-1, Math.min(1, e[i])); // Clamp to [-1, 1]
    out[i] = Math.round(v * scale);
  }
  return out;
}

/**
 * Calculates cosine similarity between two Int8 embeddings
 * @param a - First embedding
 * @param b - Second embedding
 * @returns Cosine similarity score between 0 and 1
 */
export function cosineSimInt8(a: EmbeddingI8, b: EmbeddingI8): number {
  if (a.length !== b.length) return 0;
  
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    const ai = a[i], bi = b[i];
    dot += ai * bi;
    na += ai * ai;
    nb += bi * bi;
  }
  
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Generates Int8 embedding for ingredient name (stub implementation)
 * @param _text - Ingredient name to embed
 * @returns Promise resolving to Int8Array or null if not available
 */
export async function embedNameToI8(_text: string): Promise<EmbeddingI8 | null> {
  // Stub: In real implementation, this would call an embedding model
  // and quantize the result to Int8 for efficient storage
  return null;
}
