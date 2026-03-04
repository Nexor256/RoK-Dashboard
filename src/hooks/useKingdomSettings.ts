import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface KingdomSettings {
  id: string;
  kingdom_number: number;
  kingdom_name: string;
  updated_at: string;
}

export function useKingdomSettings() {
  return useQuery<KingdomSettings | null>({
    queryKey: ["kingdom-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kingdom_settings" as any)
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data as unknown as KingdomSettings;
    },
  });
}

export function useUpdateKingdomSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, kingdom_number, kingdom_name }: { id: string; kingdom_number: number; kingdom_name: string }) => {
      const { error } = await supabase
        .from("kingdom_settings" as any)
        .update({ kingdom_number, kingdom_name, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kingdom-settings"] }),
  });
}
