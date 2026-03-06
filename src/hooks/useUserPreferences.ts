import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface FilterPreset {
  name: string;
  search?: string;
  alliance?: string;
  sortKey?: string;
  sortAsc?: boolean;
  columns?: string[];
}

export interface UserPreferences {
  rankings_columns?: string[];
  rankings_presets?: FilterPreset[];
}

export function useUserPreferences() {
  const { user } = useAuth();
  return useQuery<UserPreferences>({
    queryKey: ["user-preferences", user?.id],
    queryFn: async () => {
      if (!user) return {};
      const { data, error } = await supabase
        .from("profiles")
        .select("preferences")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return ((data as any)?.preferences ?? {}) as UserPreferences;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateUserPreferences() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (partial: Partial<UserPreferences>) => {
      if (!user) throw new Error("Not authenticated");
      // Fetch current preferences, then merge
      const { data: current, error: fetchErr } = await supabase
        .from("profiles")
        .select("preferences")
        .eq("user_id", user.id)
        .single();
      if (fetchErr) throw fetchErr;
      const existing = ((current as any)?.preferences ?? {}) as UserPreferences;
      const merged = { ...existing, ...partial };
      const { error } = await supabase
        .from("profiles" as any)
        .update({ preferences: merged } as any)
        .eq("user_id", user.id);
      if (error) throw error;
      return merged;
    },
    onSuccess: (merged) => {
      qc.setQueryData(["user-preferences", user?.id], merged);
    },
  });
}
