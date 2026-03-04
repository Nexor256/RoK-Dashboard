import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useSnapshots, useGovernorStatsMulti, type GovernorStat } from "@/hooks/useGovernorData";
import { useDkpWeights, useUpdateDkpWeights, DEFAULT_WEIGHTS, type DkpWeights } from "@/hooks/useDkpWeights";
import { useAuth } from "@/hooks/useAuth";
import { fmt } from "@/lib/utils";
import { Swords, Shield, ArrowUpDown, Search, Star, Loader2, Settings2, Check, X } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface KvKRow {
  governor_name: string;
  governor_id: string | null;
  alliance: string | null;
  power: number;
  killpoints: number;
  deaths: number;
  t4_gained: number;
  t5_gained: number;
  kills_gained: number;
  deaths_gained: number;
  dkp: number;
}

type SortKey = "governor_name" | "dkp" | "t4_gained" | "t5_gained" | "kills_gained" | "deaths_gained";

export default function KvKPage() {
  const { data: snapshots, isLoading: snapsLoading } = useSnapshots("general");
  const { data: weights = DEFAULT_WEIGHTS } = useDkpWeights();
  const updateWeights = useUpdateDkpWeights();
  const { isAdmin } = useAuth();

  const [search, setSearch] = useState("");
  const [alliance, setAlliance] = useState("all");
  const [snapFrom, setSnapFrom] = useState<string>("");
  const [snapTo, setSnapTo] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("dkp");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [weightsOpen, setWeightsOpen] = useState(false);
  const [editWeights, setEditWeights] = useState<DkpWeights | null>(null);
  const [selectedGov, setSelectedGov] = useState<KvKRow | null>(null);

  // Auto-select latest two snapshots
  const resolvedFrom = snapFrom || snapshots?.[snapshots.length - 2]?.id || "";
  const resolvedTo = snapTo || snapshots?.[snapshots.length - 1]?.id || "";

  const snapshotIds = useMemo(() => {
    const ids: string[] = [];
    if (resolvedFrom) ids.push(resolvedFrom);
    if (resolvedTo && resolvedTo !== resolvedFrom) ids.push(resolvedTo);
    return ids;
  }, [resolvedFrom, resolvedTo]);

  const { data: allStats, isLoading: statsLoading } = useGovernorStatsMulti(snapshotIds);

  // Compute per-governor diffs and DKP
  const kvkRows = useMemo<KvKRow[]>(() => {
    if (!allStats || !resolvedFrom || !resolvedTo || resolvedFrom === resolvedTo) return [];

    const statsFrom = allStats.filter((s) => s.snapshot_id === resolvedFrom);
    const statsTo = allStats.filter((s) => s.snapshot_id === resolvedTo);

    return statsTo.map((gTo) => {
      const gFrom = statsFrom.find((g) => g.governor_name === gTo.governor_name);
      const t4_gained = (gTo.t4_kills ?? 0) - (gFrom?.t4_kills ?? 0);
      const t5_gained = (gTo.t5_kills ?? 0) - (gFrom?.t5_kills ?? 0);
      const kills_gained = (gTo.total_kills ?? 0) - (gFrom?.total_kills ?? 0);
      const deaths_gained = (gTo.deaths ?? 0) - (gFrom?.deaths ?? 0);
      const dkp = t4_gained * weights.t4_kills + t5_gained * weights.t5_kills + deaths_gained * weights.deaths;

      return {
        governor_name: gTo.governor_name,
        governor_id: gTo.governor_id,
        alliance: gTo.alliance,
        power: gTo.power ?? 0,
        killpoints: gTo.killpoints ?? 0,
        deaths: gTo.deaths ?? 0,
        t4_gained,
        t5_gained,
        kills_gained,
        deaths_gained,
        dkp,
      };
    });
  }, [allStats, resolvedFrom, resolvedTo, weights]);

  const alliances = useMemo(
    () => [...new Set(kvkRows.map((g) => g.alliance).filter(Boolean))],
    [kvkRows]
  );

  const filtered = useMemo(() => {
    let list = [...kvkRows];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((g) => g.governor_name.toLowerCase().includes(q) || (g.governor_id && g.governor_id.toLowerCase().includes(q)));
    }
    if (alliance !== "all") list = list.filter((g) => g.alliance === alliance);
    list.sort((a, b) => {
      if (sortKey === "governor_name") {
        return sortDir === "desc"
          ? b.governor_name.localeCompare(a.governor_name)
          : a.governor_name.localeCompare(b.governor_name);
      }
      const av = a[sortKey];
      const bv = b[sortKey];
      return sortDir === "desc" ? bv - av : av - bv;
    });
    return list;
  }, [kvkRows, search, alliance, sortKey, sortDir]);

  const totals = useMemo(() => ({
    dkp: kvkRows.reduce((s, g) => s + g.dkp, 0),
    kills: kvkRows.reduce((s, g) => s + g.kills_gained, 0),
    deaths: kvkRows.reduce((s, g) => s + g.deaths_gained, 0),
  }), [kvkRows]);

  const chartData = useMemo(() => {
    return [...kvkRows]
      .sort((a, b) => b.dkp - a.dkp)
      .slice(0, 10)
      .map((g) => ({
        name: g.governor_name,
        dkp: g.dkp,
        kills: g.kills_gained,
      }));
  }, [kvkRows]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const sortableHead = (label: string, key: SortKey) => (
    <TableHead
      className="cursor-pointer select-none hover:text-primary transition-colors"
      onClick={() => toggleSort(key)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </span>
    </TableHead>
  );

  if (snapsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!snapshots?.length) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">KvK Performance</h1>
        <p className="text-muted-foreground">No snapshots yet. Upload general governor data to start tracking KvK performance.</p>
      </div>
    );
  }

  if (snapshots.length < 2) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">KvK Performance</h1>
        <p className="text-muted-foreground">Upload at least two general snapshots to compare and compute KvK gains.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">KvK Performance</h1>
        <p className="text-sm text-muted-foreground mt-1">Governor gains between two scans — DKP computed from the diff</p>
      </div>

      {/* Snapshot selectors + formula badge */}
      <Card className="border-border/60">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">From:</span>
              <Select value={resolvedFrom} onValueChange={setSnapFrom}>
                <SelectTrigger className="w-full sm:w-[220px] bg-muted border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {snapshots.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label || s.snapshot_date}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">To:</span>
              <Select value={resolvedTo} onValueChange={setSnapTo}>
                <SelectTrigger className="w-full sm:w-[220px] bg-muted border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {snapshots.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label || s.snapshot_date}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Formula badge */}
            <Collapsible open={weightsOpen} onOpenChange={setWeightsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-muted-foreground">
                  <Settings2 className="h-4 w-4" />
                  <span className="hidden sm:inline">DKP Formula:</span>
                  <code className="text-xs">
                    T4×{weights.t4_kills} + T5×{weights.t5_kills} + Deaths×{weights.deaths}
                  </code>
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          </div>
        </CardContent>
      </Card>

      {/* Formula weights editor (admin only) */}
      <Collapsible open={weightsOpen} onOpenChange={setWeightsOpen}>
        <CollapsibleContent>
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings2 className="h-4 w-4" /> DKP Formula Weights
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                DKP = (Δ T4 Kills × <strong>T4 weight</strong>) + (Δ T5 Kills × <strong>T5 weight</strong>) + (Δ Deaths × <strong>Deaths weight</strong>)
              </p>
            </CardHeader>
            <CardContent>
              {isAdmin ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { key: "t4_kills", label: "T4 Kills" },
                      { key: "t5_kills", label: "T5 Kills" },
                      { key: "deaths", label: "Deaths" },
                    ] as { key: keyof DkpWeights; label: string }[]).map(({ key, label }) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{label}</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={editWeights ? editWeights[key] : weights[key]}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setEditWeights((prev) => ({ ...(prev ?? weights), [key]: val }));
                          }}
                          className="h-9 bg-secondary border-border"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (editWeights) {
                          updateWeights.mutate(editWeights, {
                            onSuccess: () => {
                              setEditWeights(null);
                              setWeightsOpen(false);
                            },
                          });
                        }
                      }}
                      disabled={!editWeights || updateWeights.isPending}
                    >
                      {updateWeights.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditWeights(null);
                        setWeightsOpen(false);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditWeights({ ...DEFAULT_WEIGHTS })}
                    >
                      Reset to defaults
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { key: "t4_kills", label: "T4 Kills" },
                    { key: "t5_kills", label: "T5 Kills" },
                    { key: "deaths", label: "Deaths" },
                  ] as { key: keyof DkpWeights; label: string }[]).map(({ key, label }) => (
                    <div key={key} className="space-y-1">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <p className="font-semibold text-foreground">×{weights[key]}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {statsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !kvkRows.length ? (
        <p className="text-muted-foreground">No matching governors between the selected snapshots.</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="card-hover border-border/60 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total DKP</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Star className="h-4 w-4 text-violet-500" />
                </div>
              </CardHeader>
              <CardContent><div className="text-2xl font-extrabold font-display tabular-nums">{fmt(totals.dkp)}</div></CardContent>
            </Card>
            <Card className="card-hover border-border/60 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kills Gained</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                  <Swords className="h-4 w-4 text-rose-500" />
                </div>
              </CardHeader>
              <CardContent><div className="text-2xl font-extrabold font-display tabular-nums">{fmt(totals.kills)}</div></CardContent>
            </Card>
            <Card className="card-hover border-border/60 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deaths Gained</CardTitle>
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-amber-500" />
                </div>
              </CardHeader>
              <CardContent><div className="text-2xl font-extrabold font-display tabular-nums">{fmt(totals.deaths)}</div></CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 by DKP</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tickFormatter={fmt} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis type="category" dataKey="name" width={100} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      formatter={(v: number) => fmt(v)}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Legend />
                    <Bar dataKey="dkp" fill="hsl(var(--primary))" name="DKP" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="kills" fill="hsl(var(--accent))" name="Kills Gained" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full sm:w-64"
              />
            </div>
            <Select value={alliance} onValueChange={setAlliance}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Alliance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Alliances</SelectItem>
                {alliances.map((a) => (
                  <SelectItem key={a!} value={a!}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card className="border-border/60 overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border">
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Governor</TableHead>
                      <TableHead>Alliance</TableHead>
                      {sortableHead("T4 Gained", "t4_gained")}
                      {sortableHead("T5 Gained", "t5_gained")}
                      {sortableHead("Kills Gained", "kills_gained")}
                      {sortableHead("Deaths Gained", "deaths_gained")}
                      {sortableHead("DKP", "dkp")}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((g, i) => (
                      <TableRow key={g.governor_name} className="hover:bg-muted/30 transition-colors even:bg-muted/10">
                        <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                        <TableCell>
                          <button
                            onClick={() => setSelectedGov(g)}
                            className="font-semibold text-primary hover:underline cursor-pointer text-left text-sm"
                          >
                            {g.governor_name}
                          </button>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{g.alliance ?? "—"}</TableCell>
                        <TableCell className="text-sm tabular-nums">{fmt(g.t4_gained)}</TableCell>
                        <TableCell className="text-sm tabular-nums">{fmt(g.t5_gained)}</TableCell>
                        <TableCell className="text-sm tabular-nums">{fmt(g.kills_gained)}</TableCell>
                        <TableCell className="text-sm tabular-nums">{fmt(g.deaths_gained)}</TableCell>
                        <TableCell className="font-semibold text-primary text-sm tabular-nums">{fmt(g.dkp)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Governor detail dialog */}
          <Dialog open={!!selectedGov} onOpenChange={(open) => { if (!open) setSelectedGov(null); }}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedGov?.governor_name}</DialogTitle>
              </DialogHeader>
              {selectedGov && (
                <div className="grid grid-cols-2 gap-4 py-2">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Governor ID</p>
                    <p className="font-semibold text-foreground">{selectedGov.governor_id ?? "—"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Power</p>
                    <p className="font-semibold text-foreground">{fmt(selectedGov.power)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Kill Points</p>
                    <p className="font-semibold text-primary">{fmt(selectedGov.killpoints)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Deaths</p>
                    <p className="font-semibold text-foreground">{fmt(selectedGov.deaths)}</p>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
