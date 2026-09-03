const ISO_DATA_URL =
  "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json";

const FLAG_CDN = "https://flagcdn.com";

/** Natural Earth abbreviated / informal names → ISO alpha-2 (fallback when numeric id is missing). */
const NE_NAME_TO_ISO2 = {
  "antigua and barb.": "ag",
  "bosnia and herz.": "ba",
  "br. indian ocean ter.": "io",
  "british virgin is.": "vg",
  "cayman is.": "ky",
  "central african rep.": "cf",
  "cook is.": "ck",
  "dem. rep. congo": "cd",
  "dominican rep.": "do",
  "eq. guinea": "gq",
  "faeroe is.": "fo",
  "falkland is.": "fk",
  "fr. polynesia": "pf",
  "fr. s. antarctic lands": "tf",
  "heard i. and mcdonald is.": "hm",
  "marshall is.": "mh",
  "n. mariana is.": "mp",
  "pitcairn is.": "pn",
  "s. geo. and the is.": "gs",
  "s. sudan": "ss",
  "solomon is.": "sb",
  "st-barthélemy": "bl",
  "st-barthelemy": "bl",
  "st-martin": "mf",
  "st. kitts and nevis": "kn",
  "st. pierre and miquelon": "pm",
  "st. vin. and gren.": "vc",
  "são tomé and principe": "st",
  "sao tome and principe": "st",
  "turks and caicos is.": "tc",
  "u.s. minor outlying is.": "um",
  "u.s. virgin is.": "vi",
  "w. sahara": "eh",
  "wallis and futuna is.": "wf",
  eswatini: "sz",
  vatican: "va",
  // Kosovo has no ISO numeric id in Natural Earth; map by name only.
  kosovo: "xk",
};

/** Load ISO numeric / name → alpha-2 lookup tables from an external dataset. */
export async function loadIsoLookup() {
  const res = await fetch(ISO_DATA_URL);
  if (!res.ok) throw new Error("ISO country data fetch failed");
  const rows = await res.json();

  const byNumeric = new Map();
  const byName = new Map();
  const nameByNumeric = new Map();
  const nameByAlpha2 = new Map();

  for (const row of rows) {
    const alpha2 = row["alpha-2"].toLowerCase();
    const numeric = String(row["country-code"]).padStart(3, "0");
    const name = row.name.trim();
    byNumeric.set(numeric, alpha2);
    byName.set(name.toLowerCase(), alpha2);
    nameByNumeric.set(numeric, name);
    nameByAlpha2.set(alpha2, name);
  }

  // Kosovo is commonly used but not in the lukes ISO dataset.
  byName.set("kosovo", "xk");
  nameByAlpha2.set("xk", "Kosovo");

  return { byNumeric, byName, nameByNumeric, nameByAlpha2 };
}

export function resolveIso2(feature, byNumeric, byName) {
  const numeric = feature.id != null ? String(feature.id).padStart(3, "0") : null;
  if (numeric && byNumeric.has(numeric)) return byNumeric.get(numeric);

  const name = feature.properties?.name;
  if (!name) return null;

  const key = name.trim().toLowerCase();
  if (byName.has(key)) return byName.get(key);
  if (NE_NAME_TO_ISO2[key]) return NE_NAME_TO_ISO2[key];
  if (NE_NAME_TO_ISO2[name.trim()]) return NE_NAME_TO_ISO2[name.trim()];

  return null;
}

/** Small low-res flag image from flagcdn.com (external CDN). */
export function flagUrl(iso2) {
  if (!iso2) return null;
  return `${FLAG_CDN}/w20/${iso2.toLowerCase()}.png`;
}
