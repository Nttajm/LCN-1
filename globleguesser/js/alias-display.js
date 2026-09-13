/**
 * Short, distinct aliases for autocomplete display (postal codes, nicknames).
 * Skips full-name duplicates and long alternate spellings.
 */

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function compactKey(value) {
  return normalizeKey(value).replace(/[^a-z0-9]/g, "");
}

function formatAliasLabel(alias) {
  const trimmed = String(alias || "").trim();
  if (!trimmed) return "";
  if (trimmed.length <= 3) return trimmed.toUpperCase();
  if (/^[a-z](\.[a-z])+\.?$/i.test(trimmed)) return trimmed.toUpperCase();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/**
 * @param {string} canonicalName
 * @param {string[]} aliasKeys raw alias keys pointing at this unit
 * @param {number} [limit=2]
 * @returns {string[]} up to `limit` display labels, shortest first
 */
export function pickDisplayAliases(canonicalName, aliasKeys, limit = 2) {
  const nameKey = normalizeKey(canonicalName);
  const nameCompact = compactKey(canonicalName);
  const seen = new Set();
  const candidates = [];

  for (const raw of aliasKeys || []) {
    const key = normalizeKey(raw);
    if (!key || key === nameKey) continue;
    if (compactKey(raw) === nameCompact) continue;
    // Keep postal codes / short nicknames only — not long alternate names.
    if (raw.length > 12) continue;
    if (raw.length >= canonicalName.length) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(raw);
  }

  candidates.sort((a, b) => a.length - b.length || a.localeCompare(b));
  return candidates.slice(0, limit).map(formatAliasLabel);
}

/**
 * Group ALIASES map values → list of alias keys per canonical display name.
 * @param {Record<string, string>} aliases
 * @returns {Map<string, string[]>}
 */
export function groupAliasesByTarget(aliases) {
  const map = new Map();
  for (const [alias, targetName] of Object.entries(aliases || {})) {
    if (!map.has(targetName)) map.set(targetName, []);
    map.get(targetName).push(alias);
  }
  return map;
}
