import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import GovernorProfileCard from "@/components/GovernorProfileCard";
import { type GovernorStat } from "@/hooks/useGovernorData";

/**
 * Reads `?gov=<id>` from URL. If present, fetches latest stats for that
 * governor and opens GovernorProfileCard as a modal overlay.
 */
export default function GlobalProfileModal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const govParam = searchParams.get("gov");

  const { data: govData } = useQuery({
    queryKey: ["global_profile", govParam],
    queryFn: async () => {
      if (!govParam) return null;
      // Fetch latest stat row for this governor_id
      const { data, error } = await supabase
        .from("governor_stats")
        .select("*")
        .eq("governor_id", govParam)
        .order("snapshot_id", { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data?.[0] as GovernorStat) ?? null;
    },
    enabled: !!govParam,
    staleTime: 60_000,
  });

  if (!govParam || !govData) return null;

  return (
    <GovernorProfileCard
      governor={govData}
      onClose={() => {
        const next = new URLSearchParams(searchParams);
        next.delete("gov");
        setSearchParams(next, { replace: true });
      }}
    />
  );
}
