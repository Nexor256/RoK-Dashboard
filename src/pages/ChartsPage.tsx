import { currentGovernors, calcDKP, snapshots } from "@/data/governors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Legend,
} from "recharts";

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return n.toString();
}

export default function ChartsPage() {
  const sorted = [...currentGovernors].sort((a, b) => b.power - a.power);

  const powerData = sorted.slice(0, 10).map((g) => ({
    name: g.name,
    power: g.power,
  }));

  const killsData = sorted.slice(0, 10).map((g) => ({
    name: g.name,
    t4: g.t4Kills,
    t5: g.t5Kills,
  }));

  const dkpData = [...currentGovernors]
    .sort((a, b) => calcDKP(b) - calcDKP(a))
    .slice(0, 10)
    .map((g) => ({ name: g.name, dkp: calcDKP(g) }));

  // Growth over time: pick top 5 governors and show their power across snapshots
  const top5 = sorted.slice(0, 5).map((g) => g.id);
  const growthData = snapshots.map((snap) => {
    const entry: any = { date: snap.date };
    snap.governors.forEach((g) => {
      if (top5.includes(g.id)) entry[g.name] = g.power;
    });
    return entry;
  });
  const top5Names = sorted.slice(0, 5).map((g) => g.name);
  const lineColors = ["hsl(45, 100%, 55%)", "hsl(200, 80%, 50%)", "hsl(150, 60%, 45%)", "hsl(0, 72%, 55%)", "hsl(280, 60%, 55%)"];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Charts & Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Power Distribution */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="font-display text-lg">Power Distribution (Top 10)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={powerData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 22%)" />
                <XAxis dataKey="name" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tickFormatter={fmt} tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(220, 20%, 13%)", border: "1px solid hsl(220, 15%, 22%)", borderRadius: 8, color: "hsl(210, 20%, 92%)" }} formatter={(v: number) => fmt(v)} />
                <Bar dataKey="power" fill="hsl(45, 100%, 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Kill Points Breakdown */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="font-display text-lg">Kill Points Breakdown (Top 10)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={killsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 22%)" />
                <XAxis dataKey="name" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
                <YAxis tickFormatter={fmt} tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(220, 20%, 13%)", border: "1px solid hsl(220, 15%, 22%)", borderRadius: 8, color: "hsl(210, 20%, 92%)" }} formatter={(v: number) => fmt(v)} />
                <Legend wrapperStyle={{ color: "hsl(210, 20%, 85%)" }} />
                <Bar dataKey="t4" name="T4 Kills" fill="hsl(200, 80%, 50%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="t5" name="T5 Kills" fill="hsl(0, 72%, 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* DKP Leaderboard */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="font-display text-lg">DKP Leaderboard (Top 10)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dkpData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 22%)" />
                <XAxis type="number" tickFormatter={fmt} tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} width={100} />
                <Tooltip contentStyle={{ background: "hsl(220, 20%, 13%)", border: "1px solid hsl(220, 15%, 22%)", borderRadius: 8, color: "hsl(210, 20%, 92%)" }} formatter={(v: number) => fmt(v)} />
                <Bar dataKey="dkp" fill="hsl(35, 90%, 55%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Growth Over Time */}
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="font-display text-lg">Power Growth (Top 5)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 22%)" />
                <XAxis dataKey="date" tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} />
                <YAxis tickFormatter={fmt} tick={{ fill: "hsl(215, 15%, 55%)", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(220, 20%, 13%)", border: "1px solid hsl(220, 15%, 22%)", borderRadius: 8, color: "hsl(210, 20%, 92%)" }} formatter={(v: number) => fmt(v)} />
                <Legend wrapperStyle={{ color: "hsl(210, 20%, 85%)" }} />
                {top5Names.map((name, i) => (
                  <Line key={name} type="monotone" dataKey={name} stroke={lineColors[i]} strokeWidth={2} dot={{ fill: lineColors[i] }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
