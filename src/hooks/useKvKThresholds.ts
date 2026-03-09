import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PowerTier {
  min_power: number;  // lower bound of power range (inclusive)
  max_power: number;  // upper bound of power range (exclusive); 0 = no limit
  min_kp: number;     // minimum killpoints gained required
  min_deaths: number; // minimum deaths gained required
}

export function useKvKThresholds() {
  return useQuery<PowerTier[]>({
    queryKey: ["kvk-thresholds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kingdom_settings" as any)
        .select("dkp_thresholds")
        .limit(1)
        .single();
      if (error) throw error;
      const row = data as any;
      const raw = (row?.dkp_thresholds ?? []) as any[];
      // Migrate legacy tiers that used min_dkp instead of min_kp
      const tiers: PowerTier[] = raw.map((t) => ({
        min_power: t.min_power ?? 0,
        max_power: t.max_power ?? 0,
        min_kp: t.min_kp ?? t.min_dkp ?? 0,
        min_deaths: t.min_deaths ?? 0,
      }));
      return tiers.sort((a, b) => a.min_power - b.min_power);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateKvKThresholds() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tiers: PowerTier[]) => {
      const sorted = [...tiers].sort((a, b) => a.min_power - b.min_power);
      const { data: existing, error: fetchErr } = await supabase
        .from("kingdom_settings" as any)
        .select("id")
        .limit(1)
        .single();
      if (fetchErr) throw new Error(fetchErr.message);

      const { data: updated, error } = await supabase
        .from("kingdom_settings" as any)
        .update({ dkp_thresholds: sorted, updated_at: new Date().toISOString() } as any)
        .eq("id", (existing as any).id)
        .select("id") as any;
      if (error) throw new Error(error.message);
      if (!updated?.length) throw new Error("Update failed – you may not have permission to save settings.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kvk-thresholds"] });
    },
  });
}

/** Find the matching tier for a given power level (tier where min_power <= power < max_power) */
export function findTier(power: number, tiers: PowerTier[]): PowerTier | null {
  for (const t of tiers) {
    const inLower = power >= t.min_power;
    const inUpper = t.max_power === 0 || power < t.max_power;
    if (inLower && inUpper) return t;
  }
  return null;
}
