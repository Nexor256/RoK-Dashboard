import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface KvKWar {
  id: string;
  name: string;
  snapshot_before_id: string | null;
  snapshot_after_id: string | null;
  sort_order: number;
  created_at: string;
}

export function useKvKWars() {
  return useQuery<KvKWar[]>({
    queryKey: ["kvk_wars"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kvk_wars" as any)
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as KvKWar[];
    },
  });
}

export function useCreateKvKWar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (war: { name: string; snapshot_before_id: string | null; snapshot_after_id: string | null; sort_order: number }) => {
      const { error } = await supabase.from("kvk_wars" as any).insert(war as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kvk_wars"] }),
  });
}

export function useUpdateKvKWar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...fields }: Partial<KvKWar> & { id: string }) => {
      const { error } = await supabase
        .from("kvk_wars" as any)
        .update(fields as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kvk_wars"] }),
  });
}

export function useDeleteKvKWar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("kvk_wars" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kvk_wars"] }),
  });
}
