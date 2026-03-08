import { useMemo } from "react";
import { useSnapshots, useGovernorStatsMulti, type GovernorStat } from "@/hooks/useGovernorData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area, Legend,
} from "recharts";
import { fmt } from "@/lib/utils";
import { Loader2, TrendingUp, Swords, Skull, Gem } from "lucide-react";

interface KingdomPoint {
  date: string;
  label: string;
  totalPower: number;
  totalKillpoints: number;
  totalT4Kills: number;
  totalT5Kills: number;
  totalKills: number;
  totalDeaths: number;
  totalResourceGathered: number;
  totalRssAssistance: number;
  totalHelps: number;
  governorCount: number;
}

const chartStyle = {
  grid: "hsl(228 10% 18%)",
  tick: { fill: "hsl(var(--muted-foreground))", fontSize: 11 },
  tooltip: {
    background: "hsl(var(--card))",
    border: "1px solid hsl(228 10% 18%)",
    borderRadius: 12,
    color: "hsl(var(--foreground))",
    boxShadow: "0 8px 32px -4px hsl(0 0% 0% / 0.4)",
  },
};

export default function ChartsPage() {
  const { data: snapshots, isLoading: snapsLoading } = useSnapshots("general");
  const snapshotIds = useMemo(() => (snapshots ?? []).map((s) => s.id), [snapshots]);
  const { data: allStats, isLoading: statsLoading } = useGovernorStatsMulti(snapshotIds);

  const data = useMemo(() => {
    if (!snapshots?.length || !allStats?.length) return [];

    // Pre-group stats by snapshot_id for O(1) lookup
    const bySnap = new Map<string, GovernorStat[]>();
    for (const s of allStats) {
      let arr = bySnap.get(s.snapshot_id);
      if (!arr) { arr = []; bySnap.set(s.snapshot_id, arr); }
      arr.push(s);
    }

    return snapshots.map((snap) => {
      const rows = bySnap.get(snap.id) ?? [];
      // Single-pass aggregation
      let totalPower = 0, totalKillpoints = 0, totalT4Kills = 0, totalT5Kills = 0;
      let totalKills = 0, totalDeaths = 0, totalResourceGathered = 0;
      let totalRssAssistance = 0, totalHelps = 0;
      for (const r of rows) {
        totalPower += r.power ?? 0;
        totalKillpoints += r.killpoints ?? 0;
        totalT4Kills += r.t4_kills ?? 0;
        totalT5Kills += r.t5_kills ?? 0;
        totalKills += r.total_kills ?? 0;
        totalDeaths += r.deaths ?? 0;
        totalResourceGathered += r.resource_gathered ?? 0;
        totalRssAssistance += r.rss_assistance ?? 0;
        totalHelps += r.helps ?? 0;
      }
      return {
        date: snap.snapshot_date,
        label: snap.label || snap.snapshot_date,
        totalPower, totalKillpoints, totalT4Kills, totalT5Kills,
        totalKills, totalDeaths, totalResourceGathered,
        totalRssAssistance, totalHelps,
        governorCount: rows.length,
      } satisfies KingdomPoint;
    });
  }, [snapshots, allStats]);

  const loading = snapsLoading || statsLoading;

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!data.length) return <div className="flex items-center justify-center h-64 text-muted-foreground">No snapshot data yet. Upload snapshots to see kingdom trends.</div>;

  const charts: {
    title: string;
    icon: typeof TrendingUp;
    iconColor: string;
    iconBg: string;
    content: React.ReactNode;
  }[] = [
    {
      title: "Total Kingdom Power",
      icon: TrendingUp,
      iconColor: "text-amber-400",
      iconBg: "bg-amber-500/10",
      content: (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
            <XAxis dataKey="date" tick={chartStyle.tick} />
            <YAxis tickFormatter={fmt} tick={chartStyle.tick} />
            <Tooltip contentStyle={chartStyle.tooltip} formatter={(v: number) => fmt(v)} />
            <Area type="monotone" dataKey="totalPower" name="Total Power" stroke="hsl(45, 100%, 55%)" fill="hsl(45, 100%, 55%)" fillOpacity={0.1} strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: "Kingdom Kill Points",
      icon: Swords,
      iconColor: "text-rose-400",
      iconBg: "bg-rose-500/10",
      content: (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
            <XAxis dataKey="date" tick={chartStyle.tick} />
            <YAxis tickFormatter={fmt} tick={chartStyle.tick} />
            <Tooltip contentStyle={chartStyle.tooltip} formatter={(v: number) => fmt(v)} />
            <Legend wrapperStyle={{ color: "hsl(var(--foreground))" }} />
            <Line type="monotone" dataKey="totalKillpoints" name="Kill Points" stroke="hsl(45, 100%, 55%)" strokeWidth={2.5} dot={{ fill: "hsl(45, 100%, 55%)", r: 4 }} />
            <Line type="monotone" dataKey="totalT4Kills" name="T4 Kills" stroke="hsl(200, 80%, 50%)" strokeWidth={2.5} dot={{ fill: "hsl(200, 80%, 50%)", r: 4 }} />
            <Line type="monotone" dataKey="totalT5Kills" name="T5 Kills" stroke="hsl(0, 72%, 55%)" strokeWidth={2.5} dot={{ fill: "hsl(0, 72%, 55%)", r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: "Kills & Deaths",
      icon: Skull,
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/10",
      content: (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
            <XAxis dataKey="date" tick={chartStyle.tick} />
            <YAxis tickFormatter={fmt} tick={chartStyle.tick} />
            <Tooltip contentStyle={chartStyle.tooltip} formatter={(v: number) => fmt(v)} />
            <Legend wrapperStyle={{ color: "hsl(var(--foreground))" }} />
            <Line type="monotone" dataKey="totalKills" name="Total Kills" stroke="hsl(150, 60%, 45%)" strokeWidth={2.5} dot={{ fill: "hsl(150, 60%, 45%)", r: 4 }} />
            <Line type="monotone" dataKey="totalDeaths" name="Deaths" stroke="hsl(0, 72%, 55%)" strokeWidth={2.5} dot={{ fill: "hsl(0, 72%, 55%)", r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      ),
    },
    {
      title: "Resources & Community",
      icon: Gem,
      iconColor: "text-violet-400",
      iconBg: "bg-violet-500/10",
      content: (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
            <XAxis dataKey="date" tick={chartStyle.tick} />
            <YAxis tickFormatter={fmt} tick={chartStyle.tick} />
            <Tooltip contentStyle={chartStyle.tooltip} formatter={(v: number) => fmt(v)} />
            <Legend wrapperStyle={{ color: "hsl(var(--foreground))" }} />
            <Area type="monotone" dataKey="totalResourceGathered" name="RSS Gathered" stroke="hsl(280, 60%, 55%)" fill="hsl(280, 60%, 55%)" fillOpacity={0.1} strokeWidth={2.5} />
            <Area type="monotone" dataKey="totalRssAssistance" name="RSS Assistance" stroke="hsl(200, 60%, 55%)" fill="hsl(200, 60%, 55%)" fillOpacity={0.08} strokeWidth={2.5} />
            <Area type="monotone" dataKey="totalHelps" name="Helps" stroke="hsl(45, 100%, 55%)" fill="hsl(45, 100%, 55%)" fillOpacity={0.08} strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
          <span className="text-gradient">Kingdom Overview</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Track kingdom-wide trends across all snapshots</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {charts.map((chart) => {
          const Icon = chart.icon;
          return (
            <Card key={chart.title} className="border-white/[0.06] card-hover glass-panel overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-base font-bold flex items-center gap-2.5">
                  <div className={`h-7 w-7 rounded-lg ${chart.iconBg} flex items-center justify-center`}>
                    <Icon className={`h-4 w-4 ${chart.iconColor}`} />
                  </div>
                  {chart.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chart.content}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
