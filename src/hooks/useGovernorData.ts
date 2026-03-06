import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ── Shared types ──────────────────────────────────────────────

export interface GovernorStat {
  id: string;
  snapshot_id: string;
  governor_id: string | null;
  governor_name: string;
  alliance: string | null;
  power: number | null;
  power_growth: number | null;
  t1_kills: number | null;
  t2_kills: number | null;
  t3_kills: number | null;
  t4_kills: number | null;
  t5_kills: number | null;
  total_kills: number | null;
  t45_kills: number | null;
  killpoints: number | null;
  deaths: number | null;
  ranged: number | null;
  dead_troops: number | null;
  healed: number | null;
  resource_gathered: number | null;
  rss_assistance: number | null;
  helps: number | null;
  city_hall_level: number | null;
}

export interface SnapshotRow {
  id: string;
  snapshot_date: string;
  snapshot_type: string;
  label: string | null;
  created_at: string;
}

// ── DKP calculation ───────────────────────────────────────────

import { type DkpWeights, DEFAULT_WEIGHTS } from "./useDkpWeights";

export function calcDKP(
  g: {
    t4_kills: number | null;
    t5_kills: number | null;
    deaths: number | null;
    killpoints: number | null;
  },
  w: DkpWeights = DEFAULT_WEIGHTS,
) {
  // Prefer killpoints from CSV when available, otherwise compute from t4/t5/deaths
  if (g.killpoints) return g.killpoints;
  return (g.t4_kills ?? 0) * w.t4_kills + (g.t5_kills ?? 0) * w.t5_kills + (g.deaths ?? 0) * w.deaths;
}

// ── Hooks ─────────────────────────────────────────────────────

/** Fetch all snapshots, optionally filtered by type */
export function useSnapshots(type?: "general" | "kvk") {
  return useQuery({
    queryKey: ["snapshots", type],
    queryFn: async () => {
      let query = supabase
        .from("snapshots")
        .select("*")
        .order("snapshot_date", { ascending: true });
      if (type) query = query.eq("snapshot_type", type);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as SnapshotRow[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetch governor stats for a specific snapshot */
export function useGovernorStats(snapshotId: string | undefined) {
  return useQuery({
    queryKey: ["governor_stats", snapshotId],
    queryFn: async () => {
      if (!snapshotId) return [];
      const { data, error } = await supabase
        .from("governor_stats")
        .select("*")
        .eq("snapshot_id", snapshotId);
      if (error) throw error;
      return (data ?? []) as GovernorStat[];
    },
    enabled: !!snapshotId,
  });
}

/** Fetch governor stats for multiple snapshots at once */
export function useGovernorStatsMulti(snapshotIds: string[]) {
  return useQuery({
    queryKey: ["governor_stats_multi", snapshotIds],
    queryFn: async () => {
      if (!snapshotIds.length) return [];
      const { data, error } = await supabase
        .from("governor_stats")
        .select("*")
        .in("snapshot_id", snapshotIds);
      if (error) throw error;
      return (data ?? []) as GovernorStat[];
    },
    enabled: snapshotIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetch full history for a single governor across all snapshots (by governor_id) */
export function useGovernorHistory(governorId: string | null) {
  return useQuery({
    queryKey: ["governor_history", governorId],
    queryFn: async () => {
      if (!governorId) return [];
      const { data, error } = await supabase
        .from("governor_stats")
        .select("*, snapshots!inner(snapshot_date, label, snapshot_type)")
        .eq("governor_id", governorId)
        .order("snapshot_id");
      if (error) throw error;
      // Flatten the joined snapshot fields and sort by date
      return ((data ?? []) as (GovernorStat & { snapshots: { snapshot_date: string; label: string | null; snapshot_type: string } })[])
        .map((row) => ({
          ...row,
          snapshot_date: row.snapshots.snapshot_date,
          snapshot_label: row.snapshots.label,
          snapshot_type: row.snapshots.snapshot_type,
        }))
        .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));
    },
    enabled: !!governorId,
    staleTime: 5 * 60 * 1000,
  });
}

export type GovernorHistoryPoint = GovernorStat & {
  snapshot_date: string;
  snapshot_label: string | null;
  snapshot_type: string;
};

/** Fetch the 2nd-latest general snapshot's governor stats (for trend deltas) */
export function usePreviousGovernorStats() {
  return useQuery({
    queryKey: ["previous_governor_stats"],
    queryFn: async () => {
      const { data: snapshots, error: snapError } = await supabase
        .from("snapshots")
        .select("*")
        .eq("snapshot_type", "general")
        .order("snapshot_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(2);
      if (snapError) throw snapError;
      if (!snapshots || snapshots.length < 2) return { snapshot: null, governors: [] };

      const snapshot = snapshots[1] as SnapshotRow;

      const { data: stats, error: statsError } = await supabase
        .from("governor_stats")
        .select("*")
        .eq("snapshot_id", snapshot.id);
      if (statsError) throw statsError;

      return {
        snapshot,
        governors: (stats ?? []) as GovernorStat[],
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetch the latest general snapshot's governor stats (for dashboard & rankings) */
export function useLatestGovernorStats() {
  return useQuery({
    queryKey: ["latest_governor_stats"],
    queryFn: async () => {
      // Get latest general snapshot
      const { data: snapshots, error: snapError } = await supabase
        .from("snapshots")
        .select("*")
        .eq("snapshot_type", "general")
        .order("snapshot_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1);
      if (snapError) throw snapError;
      if (!snapshots?.length) return { snapshot: null, governors: [] };

      const snapshot = snapshots[0] as SnapshotRow;

      const { data: stats, error: statsError } = await supabase
        .from("governor_stats")
        .select("*")
        .eq("snapshot_id", snapshot.id);
      if (statsError) throw statsError;

      return {
        snapshot,
        governors: (stats ?? []) as GovernorStat[],
      };
    },
  });
}
