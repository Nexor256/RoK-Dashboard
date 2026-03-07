import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { useLatestGovernorStats, type GovernorStat } from "@/hooks/useGovernorData";
import { useKingdomSettings, useUpdateKingdomSettings } from "@/hooks/useKingdomSettings";
import { useAnnouncements, useCreateAnnouncement, useDeleteAnnouncement } from "@/hooks/useAnnouncements";
import { useAuth } from "@/hooks/useAuth";
import { Crown, Users, Swords, Skull, TrendingUp, Loader2, Pencil, Check, X, Megaphone, Trash2, Plus, Trophy, Medal, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmt } from "@/lib/utils";
import GovernorProfileCard from "@/components/GovernorProfileCard";

const statConfig: Record<string, { icon: typeof Users; gradient: string; iconColor: string; sortKey?: string }> = {
  "Total Governors": { icon: Users, gradient: "from-blue-500/10 to-blue-600/5", iconColor: "text-blue-500" },
  "Total Power": { icon: TrendingUp, gradient: "from-violet-500/10 to-violet-600/5", iconColor: "text-violet-500", sortKey: "power" },
  "Total Kills": { icon: Crown, gradient: "from-emerald-500/10 to-emerald-600/5", iconColor: "text-emerald-500", sortKey: "total_kills" },
  "Total Kill Points": { icon: Swords, gradient: "from-rose-500/10 to-rose-600/5", iconColor: "text-rose-500", sortKey: "killpoints" },
  "Total Deaths": { icon: Skull, gradient: "from-amber-500/10 to-amber-600/5", iconColor: "text-amber-500", sortKey: "deaths" },
};

const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-700"];

export default function DashboardPage() {
  const { data, isLoading } = useLatestGovernorStats();
  const { data: kingdom, isLoading: kingdomLoading } = useKingdomSettings();
  const updateKingdom = useUpdateKingdomSettings();
  const { data: announcements = [] } = useAnnouncements();
  const createAnnouncement = useCreateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();
  const { isPrivileged } = useAuth();

  const [editing, setEditing] = useState(false);
  const [editNumber, setEditNumber] = useState("");
  const [editName, setEditName] = useState("");
  const [showNewAnnouncement, setShowNewAnnouncement] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [selectedGov, setSelectedGov] = useState<GovernorStat | null>(null);
  const navigate = useNavigate();

  const governors = data?.governors ?? [];
  const snapshot = data?.snapshot;

  const isStale = useMemo(() => {
    if (!snapshot) return true;
    const snapshotDate = new Date(snapshot.snapshot_date);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return snapshotDate < sevenDaysAgo;
  }, [snapshot]);

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
      label: "Total Kills",
      value: fmt(governors.reduce((a, g) => a + (g.total_kills ?? 0), 0)),
    },
    {
      label: "Total Kill Points",
      value: fmt(governors.reduce((a, g) => a + (g.killpoints ?? 0), 0)),
    },
    {
      label: "Total Deaths",
      value: fmt(governors.reduce((a, g) => a + (g.deaths ?? 0), 0)),
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
              {isPrivileged && !kingdomLoading && (
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
          const sortKey = config?.sortKey;
          return (
            <Card
              key={s.label}
              className={`card-hover border-border/60 overflow-hidden${sortKey ? " cursor-pointer" : ""}`}
              onClick={sortKey ? () => navigate(`/rankings?sort=${sortKey}`) : undefined}
            >
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

      {/* Stale data banner for admins */}
      {isPrivileged && isStale && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
          <p className="text-sm text-foreground flex-1">
            Your data might be stale — no snapshot in the last 7 days.
          </p>
          <Link
            to="/upload"
            className="shrink-0 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600 transition-colors"
          >
            Upload Snapshot
          </Link>
        </div>
      )}

      {/* Leaderboard */}
      {(() => {
        const categories: { key: string; label: string; icon: typeof Crown; iconColor: string; getValue: (g: GovernorStat) => number }[] = [
          { key: "power", label: "Power", icon: TrendingUp, iconColor: "text-violet-500", getValue: (g) => g.power ?? 0 },
          { key: "kp", label: "Kill Points", icon: Swords, iconColor: "text-rose-500", getValue: (g) => g.killpoints ?? 0 },
          { key: "deaths", label: "Deaths", icon: Skull, iconColor: "text-amber-500", getValue: (g) => g.deaths ?? 0 },
        ];
        return (
          <Card className="border-border/60 overflow-hidden">
            <CardContent className="p-0">
              <Tabs defaultValue="power">
                <div className="flex items-center justify-between px-5 pt-4 pb-2">
                  <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" /> Leaderboard
                  </h2>
                  <TabsList className="bg-muted/60">
                    {categories.map((c) => (
                      <TabsTrigger key={c.key} value={c.key} className="text-xs px-3">
                        {c.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                {categories.map((cat) => {
                  const top5 = [...governors]
                    .sort((a, b) => cat.getValue(b) - cat.getValue(a))
                    .slice(0, 5);
                  const CatIcon = cat.icon;
                  return (
                    <TabsContent key={cat.key} value={cat.key} className="mt-0 px-5 pb-5">
                      <div className="divide-y divide-border/50">
                        {top5.map((g, i) => (
                          <div
                            key={g.id}
                            className={`flex items-center gap-3 py-2.5 ${i % 2 === 1 ? "bg-muted/10" : ""}`}
                          >
                            {i < 3 ? (
                              <Medal className={`h-6 w-6 flex-shrink-0 ${medalColors[i]}`} />
                            ) : (
                              <span className="font-display text-base font-bold text-muted-foreground w-6 text-center flex-shrink-0">
                                #{i + 1}
                              </span>
                            )}
                            <div className="flex-1 min-w-0">
                              <button
                                onClick={() => setSelectedGov(g)}
                                className="font-semibold text-foreground truncate text-sm hover:text-primary hover:underline cursor-pointer text-left block max-w-full"
                              >
                                {g.governor_name}
                              </button>
                              <span className="text-xs text-muted-foreground">[{g.alliance ?? "—"}]</span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <CatIcon className={`h-3.5 w-3.5 ${cat.iconColor}`} />
                              <span className="font-display text-sm font-bold text-foreground tabular-nums">
                                {fmt(cat.getValue(g))}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            </CardContent>
          </Card>
        );
      })()}

      {/* Governor profile popup */}
      <GovernorProfileCard
        governor={selectedGov}
        allGovernors={governors}
        onClose={() => setSelectedGov(null)}
      />

      {/* Announcements */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" /> Announcements
          </h2>
          {isPrivileged && (
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
        {isPrivileged && showNewAnnouncement && (
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
                        {isPrivileged && (
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
