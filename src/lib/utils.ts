import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format large numbers to human-readable strings (e.g. 1.5M, 2.3B) */
export function fmt(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return sign + (abs / 1_000_000_000).toFixed(1) + "B";
  if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(1) + "M";
  if (abs >= 1_000) return sign + (abs / 1_000).toFixed(1) + "K";
  return n.toString();
}

export interface RankEntry { rank: number; total: number }

/** Compute the rank of a governor in each stat category among all governors */
export function computeRanks(
  governors: { governor_id: string | null; power: number | null; killpoints: number | null; t4_kills: number | null; t5_kills: number | null; total_kills: number | null; deaths: number | null; resource_gathered: number | null }[],
  governorId: string,
): Record<string, RankEntry> {
  const keys = ["power", "killpoints", "t4_kills", "t5_kills", "total_kills", "deaths", "resource_gathered"] as const;
  const result: Record<string, RankEntry> = {};
  for (const key of keys) {
    const sorted = [...governors]
      .map((g) => ({ id: g.governor_id, val: (g[key] as number) ?? 0 }))
      .sort((a, b) => b.val - a.val);
    const idx = sorted.findIndex((s) => s.id === governorId);
    result[key] = { rank: idx >= 0 ? idx + 1 : governors.length, total: governors.length };
  }
  return result;
}
