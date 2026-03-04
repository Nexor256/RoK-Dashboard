import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useLatestGovernorStats } from "@/hooks/useGovernorData";
import { useKingdomSettings, useUpdateKingdomSettings } from "@/hooks/useKingdomSettings";
import { useAuth } from "@/hooks/useAuth";
import { Crown, Users, Swords, Skull, TrendingUp, Loader2, Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/utils";

const iconMap = {
  "Total Governors": Users,
  "Total Power": TrendingUp,
  "Total Kill Points": Swords,
  "Total Deaths": Skull,
  "Total Kills": Crown,
};

const colorMap: Record<string, string> = {
  "Total Governors": "text-accent",
  "Total Power": "text-primary",
  "Total Kill Points": "text-danger",
  "Total Deaths": "text-muted-foreground",
  "Total Kills": "text-warning",
};

export default function DashboardPage() {
  const { data, isLoading } = useLatestGovernorStats();
  const { data: kingdom, isLoading: kingdomLoading } = useKingdomSettings();
  const updateKingdom = useUpdateKingdomSettings();
  const { isAdmin } = useAuth();

  const [editing, setEditing] = useState(false);
  const [editNumber, setEditNumber] = useState("");
  const [editName, setEditName] = useState("");

  function startEdit() {
    setEditNumber(String(kingdom?.kingdom_number ?? ""));
    setEditName(kingdom?.kingdom_name ?? "");
    setEditing(true);
  }

  function saveEdit() {
    if (!kingdom) return;
    updateKingdom.mutate(
      { id: kingdom.id, kingdom_number: Number(editNumber) || 0, kingdom_name: editName },
      { onSuccess: () => setEditing(false) },
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const governors = data?.governors ?? [];
  const snapshot = data?.snapshot;

  if (!governors.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2">
        <Crown className="h-12 w-12" />
        <p className="text-lg font-medium">No data yet</p>
        <p className="text-sm">Upload a governor snapshot to get started.</p>
      </div>
    );
  }

  const stats = [
    { label: "Total Governors", value: governors.length.toString() },
    {
      label: "Total Power",
      value: fmt(governors.reduce((a, g) => a + (g.power ?? 0), 0)),
    },
    {
      label: "Total Kill Points",
      value: fmt(governors.reduce((a, g) => a + (g.killpoints ?? 0), 0)),
    },
    {
      label: "Total Deaths",
      value: fmt(governors.reduce((a, g) => a + (g.deaths ?? 0), 0)),
    },
    {
      label: "Total Kills",
      value: fmt(governors.reduce((a, g) => a + (g.total_kills ?? 0), 0)),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Kingdom Header */}
      <div className="flex items-end justify-between">
        <div>
          {editing ? (
            <div className="flex items-center gap-2 mb-1">
              <Input
                type="number"
                placeholder="Kingdom #"
                value={editNumber}
                onChange={(e) => setEditNumber(e.target.value)}
                className="w-24 h-8 text-sm bg-card border-border"
              />
              <Input
                placeholder="Kingdom name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-48 h-8 text-sm bg-card border-border"
              />
              <Button size="sm" variant="ghost" onClick={saveEdit} disabled={updateKingdom.isPending}>
                <Check className="h-4 w-4 text-green-500" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                <X className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground uppercase tracking-wider">
                {kingdom && kingdom.kingdom_number > 0
                  ? `Kingdom #${kingdom.kingdom_number}${kingdom.kingdom_name ? ` — ${kingdom.kingdom_name}` : ""}`
                  : "Kingdom Overview"}
              </p>
              {isAdmin && !kingdomLoading && (
                <button onClick={startEdit} className="text-muted-foreground hover:text-foreground transition-colors">
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
          <h1 className="font-display text-4xl font-bold text-foreground">
            Governor Dashboard
          </h1>
        </div>
        {snapshot && (
          <p className="text-sm text-muted-foreground">
            Snapshot: {snapshot.label || snapshot.snapshot_date}
          </p>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((s) => {
          const Icon = iconMap[s.label as keyof typeof iconMap];
          const color = colorMap[s.label] ?? "text-primary";
          return (
            <Card key={s.label} className="bg-card border-border">
              <CardContent className="p-5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</span>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <span className="font-display text-3xl font-bold text-foreground">{s.value}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Top Governors Preview */}
      <div>
        <h2 className="font-display text-xl font-semibold text-foreground mb-4">Top Governors by Power</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[...governors]
            .sort((a, b) => (b.power ?? 0) - (a.power ?? 0))
            .slice(0, 8)
            .map((g, i) => (
              <Card key={g.id} className="bg-card border-border">
                <CardContent className="p-4 flex items-center gap-3">
                  <span className="font-display text-2xl font-bold text-primary w-8">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{g.governor_name}</p>
                    <p className="text-xs text-muted-foreground">[{g.alliance ?? "—"}]</p>
                  </div>
                  <span className="font-display text-lg font-semibold text-foreground">{fmt(g.power ?? 0)}</span>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>
    </div>
  );
}
