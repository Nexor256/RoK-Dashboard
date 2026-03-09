import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DkpWeights {
  t4_kills: number;
  t5_kills: number;
  deaths: number;
}

export const DEFAULT_WEIGHTS: DkpWeights = {
  t4_kills: 5,
  t5_kills: 10,
  deaths: 40,
};

export function useDkpWeights() {
  return useQuery<DkpWeights>({
    queryKey: ["dkp-weights"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kingdom_settings" as any)
        .select("dkp_weights")
        .limit(1)
        .single();
      if (error) throw error;
      const row = data as any;
      return { ...DEFAULT_WEIGHTS, ...(row?.dkp_weights ?? {}) };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateDkpWeights() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (weights: DkpWeights) => {
      // Get the kingdom_settings row id first
      const { data: existing, error: fetchErr } = await supabase
        .from("kingdom_settings" as any)
        .select("id")
        .limit(1)
        .single();
      if (fetchErr) throw new Error(fetchErr.message);

      const { data: updated, error } = await supabase
        .from("kingdom_settings" as any)
        .update({ dkp_weights: weights, updated_at: new Date().toISOString() } as any)
        .eq("id", (existing as any).id)
        .select("id") as any;
      if (error) throw new Error(error.message);
      if (!updated?.length) throw new Error("Update failed – you may not have permission to save settings.");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dkp-weights"] });
    },
  });
}
