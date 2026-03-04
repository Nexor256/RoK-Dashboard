import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useLatestGovernorStats } from "@/hooks/useGovernorData";
import { useKingdomSettings, useUpdateKingdomSettings } from "@/hooks/useKingdomSettings";
import { useAnnouncements, useCreateAnnouncement, useDeleteAnnouncement } from "@/hooks/useAnnouncements";
import { useAuth } from "@/hooks/useAuth";
import { Crown, Users, Swords, Skull, TrendingUp, Loader2, Pencil, Check, X, Megaphone, Trash2, Plus, Trophy, Medal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/utils";

const statConfig: Record<string, { icon: typeof Users; gradient: string; iconColor: string }> = {
  "Total Governors": { icon: Users, gradient: "from-blue-500/10 to-blue-600/5", iconColor: "text-blue-500" },
  "Total Power": { icon: TrendingUp, gradient: "from-violet-500/10 to-violet-600/5", iconColor: "text-violet-500" },
  "Total Kill Points": { icon: Swords, gradient: "from-rose-500/10 to-rose-600/5", iconColor: "text-rose-500" },
  "Total Deaths": { icon: Skull, gradient: "from-amber-500/10 to-amber-600/5", iconColor: "text-amber-500" },
  "Total Kills": { icon: Crown, gradient: "from-emerald-500/10 to-emerald-600/5", iconColor: "text-emerald-500" },
};

const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-700"];

export default function DashboardPage() {
  const { data, isLoading } = useLatestGovernorStats();
  const { data: kingdom, isLoading: kingdomLoading } = useKingdomSettings();
  const updateKingdom = useUpdateKingdomSettings();
  const { data: announcements = [] } = useAnnouncements();
  const createAnnouncement = useCreateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();
  const { isAdmin } = useAuth();

  const [editing, setEditing] = useState(false);
  const [editNumber, setEditNumber] = useState("");
  const [editName, setEditName] = useState("");
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");

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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
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
          <h1 className="font-display text-2xl sm:text-4xl font-bold text-foreground">
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {stats.map((s) => {
          const config = statConfig[s.label];
          const Icon = config?.icon ?? Users;
          const gradient = config?.gradient ?? "from-primary/10 to-primary/5";
          const iconColor = config?.iconColor ?? "text-primary";
          return (
            <Card key={s.label} className="card-hover border-border/60 overflow-hidden">
              <CardContent className={`p-5 flex flex-col gap-3 bg-gradient-to-br ${gradient}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{s.label}</span>
                  <div className={`h-8 w-8 rounded-lg bg-background/80 flex items-center justify-center ${iconColor}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <span className="font-display text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">{s.value}</span>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Top Governors Preview */}
      <div>
        <h2 className="font-display text-xl font-bold text-foreground mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" /> Top Governors by Power
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[...governors]
            .sort((a, b) => (b.power ?? 0) - (a.power ?? 0))
            .slice(0, 8)
            .map((g, i) => (
              <Card key={g.id} className={`card-hover border-border/60 ${i < 3 ? 'ring-1 ring-primary/20' : ''}`}>
                <CardContent className="p-4 flex items-center gap-3">
                  {i < 3 ? (
                    <div className="flex-shrink-0">
                      <Medal className={`h-7 w-7 ${medalColors[i]}`} />
                    </div>
                  ) : (
                    <span className="font-display text-lg font-bold text-muted-foreground w-7 text-center flex-shrink-0">#{i + 1}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate text-sm">{g.governor_name}</p>
                    <p className="text-xs text-muted-foreground">[{g.alliance ?? "—"}]</p>
                  </div>
                  <span className="font-display text-sm font-bold text-primary tabular-nums">{fmt(g.power ?? 0)}</span>
                </CardContent>
              </Card>
            ))}
        </div>
      </div>

      {/* Announcements */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" /> Announcements
          </h2>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 rounded-lg"
              onClick={() => setShowNewAnnouncement(!showNewAnnouncement)}
            >
              <Plus className="h-4 w-4" /> New
            </Button>
          )}
        </div>

        {/* Admin new announcement form */}
        {isAdmin && showNewAnnouncement && (
          <Card className="border-primary/30 mb-4 shadow-md">
            <CardContent className="p-4 space-y-3">
              <Input
                placeholder="Announcement title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="bg-muted border-border"
                maxLength={200}
              />
              <Textarea
                placeholder="Write your announcement..."
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                className="bg-muted border-border min-h-[80px]"
                maxLength={2000}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={!newTitle.trim() || !newBody.trim() || createAnnouncement.isPending}
                  onClick={() => {
                    createAnnouncement.mutate(
                      { title: newTitle.trim(), body: newBody.trim() },
                      {
                        onSuccess: () => {
                          setNewTitle("");
                          setNewBody("");
                          setShowNewAnnouncement(false);
                        },
                      },
                    );
                  }}
                >
                  {createAnnouncement.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  Post
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowNewAnnouncement(false);
                    setNewTitle("");
                    setNewBody("");
                  }}
                >
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {announcements.length === 0 ? (
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => (
              <Card key={a.id} className="border-border/60 overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex">
                    <div className="w-1 bg-primary shrink-0" />
                    <div className="p-4 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground">{a.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{a.body}</p>
                          <p className="text-xs text-muted-foreground/70 mt-2">
                            {new Date(a.created_at).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive shrink-0"
                            onClick={() => deleteAnnouncement.mutate(a.id)}
                            disabled={deleteAnnouncement.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
