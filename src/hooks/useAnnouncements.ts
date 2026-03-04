import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  created_by: string | null;
  created_at: string;
}

export function useAnnouncements() {
  return useQuery<Announcement[]>({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as unknown as Announcement[];
    },
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, body }: { title: string; body: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("announcements" as any)
        .insert({ title, body, created_by: user?.id } as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("announcements" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}
