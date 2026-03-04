/** Shared CSV parsing utilities */

export interface ParsedRow {
  [key: string]: string;
}

/** Parse a CSV string into an array of row objects keyed by header name */
export function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const row: ParsedRow = {};
      headers.forEach((h, i) => {
        row[h] = values[i] || "";
      });
      return row;
    });
}

/** Map for normalizing common CSV header variations to DB column names */
const HEADER_MAP: Record<string, string> = {
  // Governor identity
  id: "governor_id",
  name: "governor_name",
  governor: "governor_name",
  gov_name: "governor_name",
  // Kill tiers
  t1_kills: "t1_kills",
  t2_kills: "t2_kills",
  t3_kills: "t3_kills",
  t4_kills: "t4_kills",
  t4kills: "t4_kills",
  t4: "t4_kills",
  t5_kills: "t5_kills",
  t5kills: "t5_kills",
  t5: "t5_kills",
  total_kills: "total_kills",
  t45_kills: "t45_kills",
  // Stats
  deads: "deaths",
  dead: "deaths",
  rss_gathered: "resource_gathered",
  resources: "resource_gathered",
  rss_assistance: "rss_assistance",
  city_hall_level: "city_hall_level",
  // KvK
  kvk_kill: "kvk_kills",
  kvk_death: "kvk_deaths",
};

/** Normalize parsed rows by mapping header variations to canonical DB column names */
export function normalizeHeaders(rows: ParsedRow[]): ParsedRow[] {
  return rows.map((row) => {
    const normalized: ParsedRow = {};
    for (const [key, value] of Object.entries(row)) {
      const mapped = HEADER_MAP[key] || key;
      normalized[mapped] = value;
    }
    return normalized;
  });
}
