import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PowerTier {
  min_power: number;  // governors with power >= this value
  min_dkp: number;    // must achieve at least this DKP
  min_deaths: number; // must achieve at least this many deaths
}

export function useKvKThresholds() {
  return useQuery<PowerTier[]>({
    queryKey: ["kvk-thresholds"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kingdom_settings" as any)
        .select("kvk_thresholds")
        .limit(1)
        .single();
      if (error) throw error;
      const row = data as any;
      const tiers = (row?.kvk_thresholds ?? []) as PowerTier[];
      // Sort ascending by min_power
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
      if (fetchErr) throw fetchErr;

      const { error } = await supabase
        .from("kingdom_settings" as any)
        .update({ kvk_thresholds: sorted, updated_at: new Date().toISOString() } as any)
        .eq("id", (existing as any).id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kvk-thresholds"] });
    },
  });
}

/** Find the matching tier for a given power level (highest tier where power >= min_power) */
export function findTier(power: number, tiers: PowerTier[]): PowerTier | null {
  // tiers are sorted ascending; walk backwards to find highest match
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (power >= tiers[i].min_power) return tiers[i];
  }
  return null;
}
