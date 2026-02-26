import { Card, CardContent } from "@/components/ui/card";
import { currentGovernors, kingdomInfo, calcDKP } from "@/data/governors";
import { Crown, Users, Swords, Skull, TrendingUp } from "lucide-react";

function fmt(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

const stats = [
  {
    label: "Total Governors",
    value: currentGovernors.length,
    icon: Users,
    color: "text-accent",
  },
  {
    label: "Average Power",
    value: fmt(currentGovernors.reduce((a, g) => a + g.power, 0) / currentGovernors.length),
    icon: TrendingUp,
    color: "text-primary",
  },
  {
    label: "Total Kill Points",
    value: fmt(currentGovernors.reduce((a, g) => a + g.t4Kills + g.t5Kills, 0)),
    icon: Swords,
    color: "text-danger",
  },
  {
    label: "Total Deaths",
    value: fmt(currentGovernors.reduce((a, g) => a + g.deaths, 0)),
    icon: Skull,
    color: "text-muted-foreground",
  },
  {
    label: "Total DKP",
    value: fmt(currentGovernors.reduce((a, g) => a + calcDKP(g), 0)),
    icon: Crown,
    color: "text-warning",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Kingdom Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground uppercase tracking-wider">Kingdom</p>
          <h1 className="font-display text-4xl font-bold text-foreground">
            #{kingdomInfo.number} — {kingdomInfo.name}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Last updated: {kingdomInfo.lastUpdated}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-5 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</span>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <span className="font-display text-3xl font-bold text-foreground">{s.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top Governors Preview */}
      <div>
        <h2 className="font-display text-xl font-semibold text-foreground mb-4">Top Governors by Power</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[...currentGovernors]
            .sort((a, b) => b.power - a.power)
            .slice(0, 8)
            .map((g, i) => (
              <Card key={g.id} className="bg-card border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <span className="font-display text-2xl font-bold text-primary w-8">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{g.name}</p>
                    <p className="text-xs text-muted-foreground">[{g.alliance}]</p>
                  </div>
                  <span className="font-display text-lg font-semibold text-foreground">{fmt(g.power)}</span>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>
    </div>
  );
}
