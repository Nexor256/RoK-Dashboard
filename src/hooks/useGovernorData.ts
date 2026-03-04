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

export interface KvKStat {
  id: string;
  snapshot_id: string;
  governor_name: string;
  alliance: string | null;
  kvk_kills: number | null;
  kvk_deaths: number | null;
}

export interface SnapshotRow {
  id: string;
  snapshot_date: string;
  snapshot_type: string;
  label: string | null;
  created_at: string;
}

// ── DKP calculation ───────────────────────────────────────────

export function calcDKP(g: {
  t4_kills: number | null;
  t5_kills: number | null;
  dead_troops: number | null;
  killpoints: number | null;
}) {
  // Prefer killpoints from CSV when available, otherwise compute from t4/t5/dead
  if (g.killpoints) return g.killpoints;
  return (g.t4_kills ?? 0) * 4 + (g.t5_kills ?? 0) * 10 + (g.dead_troops ?? 0) * 15;
}

export function calcKvKPoints(g: { kvk_kills: number | null; kvk_deaths: number | null }) {
  // KvK points: kills contribute positively, deaths count as sacrifice
  return (g.kvk_kills ?? 0) + (g.kvk_deaths ?? 0) * 2;
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

/** Fetch KvK stats for a specific snapshot */
export function useKvKStats(snapshotId: string | undefined) {
  return useQuery({
    queryKey: ["kvk_stats", snapshotId],
    queryFn: async () => {
      if (!snapshotId) return [];
      const { data, error } = await supabase
        .from("kvk_stats")
        .select("*")
        .eq("snapshot_id", snapshotId);
      if (error) throw error;
      return (data ?? []) as KvKStat[];
    },
    enabled: !!snapshotId,
  });
}

/** Fetch all KvK snapshots with their stats */
export function useKvKSnapshots() {
  return useQuery({
    queryKey: ["kvk_snapshots"],
    queryFn: async () => {
      const { data: snapshots, error: snapError } = await supabase
        .from("snapshots")
        .select("*")
        .eq("snapshot_type", "kvk")
        .order("snapshot_date", { ascending: true });
      if (snapError) throw snapError;
      return (snapshots ?? []) as SnapshotRow[];
    },
  });
}
