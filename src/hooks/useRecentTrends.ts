import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { GovernorStat, SnapshotRow } from "@/hooks/useGovernorData";

/**
 * Fetches the last N general snapshots and builds
 * a map of governor_id -> { power[], killpoints[] } arrays for sparklines.
 */
export function useRecentTrends(count = 5) {
  return useQuery({
    queryKey: ["recent_trends", count],
    queryFn: async () => {
      // 1. Get last N general snapshots
      const { data: snapshots, error: snapErr } = await supabase
        .from("snapshots")
        .select("id, snapshot_date")
        .eq("snapshot_type", "general")
        .order("snapshot_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(count);
      if (snapErr) throw snapErr;
      if (!snapshots?.length) return new Map<string, TrendData>();

      // Reverse to chronological order
      const ordered = (snapshots as Pick<SnapshotRow, "id" | "snapshot_date">[]).reverse();
      const ids = ordered.map((s) => s.id);

      // 2. Fetch all governor stats for those snapshots
      const { data: stats, error: statsErr } = await supabase
        .from("governor_stats")
        .select("*")
        .in("snapshot_id", ids);
      if (statsErr) throw statsErr;

      // 3. Build trend map   governor_key -> ordered values
      const orderIndex = new Map(ids.map((id, idx) => [id, idx]));
      const trends = new Map<string, TrendData>();

      for (const s of ((stats ?? []) as unknown as { governor_id: string | null; governor_name: string; power: number | null; killpoints: number | null; snapshot_id: string }[])) {
        const key = s.governor_id || s.governor_name;
        if (!key) continue;

        let entry = trends.get(key);
        if (!entry) {
          entry = { power: new Array(ids.length).fill(null), killpoints: new Array(ids.length).fill(null) };
          trends.set(key, entry);
        }

        const idx = orderIndex.get(s.snapshot_id);
        if (idx !== undefined) {
          entry.power[idx] = s.power ?? 0;
          entry.killpoints[idx] = s.killpoints ?? 0;
        }
      }

      return trends;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export interface TrendData {
  power: (number | null)[];
  killpoints: (number | null)[];
}
