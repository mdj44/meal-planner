/**
 * Normalizes ingredient names for consistent lookup
 * @param s - Raw ingredient name string
 * @returns Normalized string with consistent formatting
 */
export function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[\u2018\u2019']/g, "'") // Normalize smart quotes
    .replace(/[^a-z0-9\s.-]/g, "") // Remove special chars except spaces, dots, hyphens
    .replace(/\s+/g, " "); // Normalize whitespace
}

/**
 * Extracts quantity, unit, and name from ingredient strings
 * @param s - Ingredient string like "2 cups flour" or "1 lb chicken breast"
 * @returns Object with parsed quantity, unit, and cleaned name
 */
export function extractQtyUnit(s: string): { qty?: number; unit?: string; name: string } {
  const m = s.match(/^\s*(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s+(.*)$/);
  if (!m) return { name: s.trim() };
  
  const [, q, u, rest] = m;
  const qty = Number(q);
  return { 
    qty: Number.isFinite(qty) ? qty : undefined, 
    unit: u.toLowerCase(), 
    name: rest.trim() 
  };
}
