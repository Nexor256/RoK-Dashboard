import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  AreaChart, Area, Legend,
} from "recharts";

function fmt(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return n.toString();
}

interface KingdomPoint {
  date: string;
  label: string;
  totalPower: number;
  totalT4Kills: number;
  totalT5Kills: number;
  totalDeaths: number;
  totalDeadTroops: number;
  totalHealed: number;
  totalResourceGathered: number;
  governorCount: number;
}

const chartStyle = {
  grid: "hsl(220, 15%, 22%)",
  tick: { fill: "hsl(215, 15%, 55%)", fontSize: 11 },
  tooltip: {
    background: "hsl(220, 20%, 13%)",
    border: "1px solid hsl(220, 15%, 22%)",
    borderRadius: 8,
    color: "hsl(210, 20%, 92%)",
  },
};

export default function ChartsPage() {
  const [data, setData] = useState<KingdomPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: snapshots } = await supabase
        .from("snapshots")
        .select("id, snapshot_date, label, snapshot_type")
        .eq("snapshot_type", "general")
        .order("snapshot_date", { ascending: true });

      if (!snapshots?.length) { setLoading(false); return; }

      const { data: stats } = await supabase
        .from("governor_stats")
        .select("snapshot_id, power, t4_kills, t5_kills, deaths, dead_troops, healed, resource_gathered")
        .in("snapshot_id", snapshots.map(s => s.id));

      const points: KingdomPoint[] = snapshots.map(snap => {
        const rows = (stats || []).filter(s => s.snapshot_id === snap.id);
        return {
          date: snap.snapshot_date,
          label: snap.label || snap.snapshot_date,
          totalPower: rows.reduce((s, r) => s + (r.power || 0), 0),
          totalT4Kills: rows.reduce((s, r) => s + (r.t4_kills || 0), 0),
          totalT5Kills: rows.reduce((s, r) => s + (r.t5_kills || 0), 0),
          totalDeaths: rows.reduce((s, r) => s + (r.deaths || 0), 0),
          totalDeadTroops: rows.reduce((s, r) => s + (r.dead_troops || 0), 0),
          totalHealed: rows.reduce((s, r) => s + (r.healed || 0), 0),
          totalResourceGathered: rows.reduce((s, r) => s + (r.resource_gathered || 0), 0),
          governorCount: rows.length,
        };
      });

      setData(points);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  if (!data.length) return <div className="flex items-center justify-center h-64 text-muted-foreground">No snapshot data yet. Upload snapshots to see kingdom trends.</div>;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Kingdom Overview</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Total Power Over Time */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="font-display text-lg">Total Kingdom Power</CardTitle></CardHeader>
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
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="font-display text-lg">Kingdom Kill Points</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
                <XAxis dataKey="date" tick={chartStyle.tick} />
                <YAxis tickFormatter={fmt} tick={chartStyle.tick} />
                <Tooltip contentStyle={chartStyle.tooltip} formatter={(v: number) => fmt(v)} />
                <Legend wrapperStyle={{ color: "hsl(210, 20%, 85%)" }} />
                <Line type="monotone" dataKey="totalT4Kills" name="T4 Kills" stroke="hsl(200, 80%, 50%)" strokeWidth={2} dot={{ fill: "hsl(200, 80%, 50%)" }} />
                <Line type="monotone" dataKey="totalT5Kills" name="T5 Kills" stroke="hsl(0, 72%, 55%)" strokeWidth={2} dot={{ fill: "hsl(0, 72%, 55%)" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Deaths & Healing Over Time */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="font-display text-lg">Deaths & Healing</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
                <XAxis dataKey="date" tick={chartStyle.tick} />
                <YAxis tickFormatter={fmt} tick={chartStyle.tick} />
                <Tooltip contentStyle={chartStyle.tooltip} formatter={(v: number) => fmt(v)} />
                <Legend wrapperStyle={{ color: "hsl(210, 20%, 85%)" }} />
                <Line type="monotone" dataKey="totalDeaths" name="Deaths" stroke="hsl(0, 72%, 55%)" strokeWidth={2} dot={{ fill: "hsl(0, 72%, 55%)" }} />
                <Line type="monotone" dataKey="totalDeadTroops" name="Dead Troops" stroke="hsl(30, 90%, 55%)" strokeWidth={2} dot={{ fill: "hsl(30, 90%, 55%)" }} />
                <Line type="monotone" dataKey="totalHealed" name="Healed" stroke="hsl(150, 60%, 45%)" strokeWidth={2} dot={{ fill: "hsl(150, 60%, 45%)" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Resources & Governor Count */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="font-display text-lg">Resources Gathered & Governors</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartStyle.grid} />
                <XAxis dataKey="date" tick={chartStyle.tick} />
                <YAxis tickFormatter={fmt} tick={chartStyle.tick} />
                <Tooltip contentStyle={chartStyle.tooltip} formatter={(v: number) => fmt(v)} />
                <Legend wrapperStyle={{ color: "hsl(210, 20%, 85%)" }} />
                <Area type="monotone" dataKey="totalResourceGathered" name="Resources Gathered" stroke="hsl(280, 60%, 55%)" fill="hsl(280, 60%, 55%)" fillOpacity={0.15} strokeWidth={2} />
                <Area type="monotone" dataKey="governorCount" name="Governor Count" stroke="hsl(45, 100%, 55%)" fill="hsl(45, 100%, 55%)" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
