import { useMemo } from "react";
import { useSnapshots, useGovernorStatsMulti, type GovernorStat } from "@/hooks/useGovernorData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area, Legend,
} from "recharts";
import { fmt } from "@/lib/utils";
import { Loader2 } from "lucide-react";

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
  grid: "hsl(var(--border))",
  tick: { fill: "hsl(var(--muted-foreground))", fontSize: 11 },
  tooltip: {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    color: "hsl(var(--foreground))",
  },
};

export default function ChartsPage() {
  const { data: snapshots, isLoading: snapsLoading } = useSnapshots("general");
  const snapshotIds = useMemo(() => (snapshots ?? []).map((s) => s.id), [snapshots]);
  const { data: allStats, isLoading: statsLoading } = useGovernorStatsMulti(snapshotIds);

  const data = useMemo(() => {
    if (!snapshots?.length || !allStats?.length) return [];
    return snapshots.map((snap) => {
      const rows = allStats.filter((s) => s.snapshot_id === snap.id);
      return {
        date: snap.snapshot_date,
        label: snap.label || snap.snapshot_date,
        totalPower: rows.reduce((s, r) => s + (r.power ?? 0), 0),
        totalKillpoints: rows.reduce((s, r) => s + (r.killpoints ?? 0), 0),
        totalT4Kills: rows.reduce((s, r) => s + (r.t4_kills ?? 0), 0),
        totalT5Kills: rows.reduce((s, r) => s + (r.t5_kills ?? 0), 0),
        totalKills: rows.reduce((s, r) => s + (r.total_kills ?? 0), 0),
        totalDeaths: rows.reduce((s, r) => s + (r.deaths ?? 0), 0),
        totalResourceGathered: rows.reduce((s, r) => s + (r.resource_gathered ?? 0), 0),
        totalRssAssistance: rows.reduce((s, r) => s + (r.rss_assistance ?? 0), 0),
        totalHelps: rows.reduce((s, r) => s + (r.helps ?? 0), 0),
        governorCount: rows.length,
      } satisfies KingdomPoint;
    });
  }, [snapshots, allStats]);

  const loading = snapsLoading || statsLoading;

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!data.length) return <div className="flex items-center justify-center h-64 text-muted-foreground">No snapshot data yet. Upload snapshots to see kingdom trends.</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">Kingdom Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Track kingdom-wide trends across all snapshots</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Total Power Over Time */}
        <Card className="border-border/60 card-hover">
          <CardHeader><CardTitle className="font-display text-base font-bold">Total Kingdom Power</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
                <XAxis dataKey="date" tick={chartStyle.tick} />
                <YAxis tickFormatter={fmt} tick={chartStyle.tick} />
                <Tooltip contentStyle={chartStyle.tooltip} formatter={(v: number) => fmt(v)} />
                <Area type="monotone" dataKey="totalPower" name="Total Power" stroke="hsl(45, 100%, 55%)" fill="hsl(45, 100%, 55%)" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Kill Points Over Time */}
        <Card className="border-border/60 card-hover">
          <CardHeader><CardTitle className="font-display text-base font-bold">Kingdom Kill Points</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
                <XAxis dataKey="date" tick={chartStyle.tick} />
                <YAxis tickFormatter={fmt} tick={chartStyle.tick} />
                <Tooltip contentStyle={chartStyle.tooltip} formatter={(v: number) => fmt(v)} />
                <Legend wrapperStyle={{ color: "hsl(var(--foreground))" }} />
                <Line type="monotone" dataKey="totalKillpoints" name="Kill Points" stroke="hsl(45, 100%, 55%)" strokeWidth={2} dot={{ fill: "hsl(45, 100%, 55%)" }} />
                <Line type="monotone" dataKey="totalT4Kills" name="T4 Kills" stroke="hsl(200, 80%, 50%)" strokeWidth={2} dot={{ fill: "hsl(200, 80%, 50%)" }} />
                <Line type="monotone" dataKey="totalT5Kills" name="T5 Kills" stroke="hsl(0, 72%, 55%)" strokeWidth={2} dot={{ fill: "hsl(0, 72%, 55%)" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Deaths & Total Kills Over Time */}
        <Card className="border-border/60 card-hover">
          <CardHeader><CardTitle className="font-display text-base font-bold">Kills & Deaths</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
                <XAxis dataKey="date" tick={chartStyle.tick} />
                <YAxis tickFormatter={fmt} tick={chartStyle.tick} />
                <Tooltip contentStyle={chartStyle.tooltip} formatter={(v: number) => fmt(v)} />
                <Legend wrapperStyle={{ color: "hsl(var(--foreground))" }} />
                <Line type="monotone" dataKey="totalKills" name="Total Kills" stroke="hsl(150, 60%, 45%)" strokeWidth={2} dot={{ fill: "hsl(150, 60%, 45%)" }} />
                <Line type="monotone" dataKey="totalDeaths" name="Deaths" stroke="hsl(0, 72%, 55%)" strokeWidth={2} dot={{ fill: "hsl(0, 72%, 55%)" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Resources & Helps */}
        <Card className="border-border/60 card-hover">
          <CardHeader><CardTitle className="font-display text-base font-bold">Resources & Community</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
                <XAxis dataKey="date" tick={chartStyle.tick} />
                <YAxis tickFormatter={fmt} tick={chartStyle.tick} />
                <Tooltip contentStyle={chartStyle.tooltip} formatter={(v: number) => fmt(v)} />
                <Legend wrapperStyle={{ color: "hsl(var(--foreground))" }} />
                <Area type="monotone" dataKey="totalResourceGathered" name="RSS Gathered" stroke="hsl(280, 60%, 55%)" fill="hsl(280, 60%, 55%)" fillOpacity={0.15} strokeWidth={2} />
                <Area type="monotone" dataKey="totalRssAssistance" name="RSS Assistance" stroke="hsl(200, 60%, 55%)" fill="hsl(200, 60%, 55%)" fillOpacity={0.1} strokeWidth={2} />
                <Area type="monotone" dataKey="totalHelps" name="Helps" stroke="hsl(45, 100%, 55%)" fill="hsl(45, 100%, 55%)" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
