import { useState, useMemo, useCallback } from "react";
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import GovernorProfileCard, { type KvKExtras } from "@/components/GovernorProfileCard";
import {
  useSnapshots,
  useGovernorStatsMulti,
  type GovernorStat,
} from "@/hooks/useGovernorData";
import {
  useDkpWeights,
  useUpdateDkpWeights,
  DEFAULT_WEIGHTS,
  type DkpWeights,
} from "@/hooks/useDkpWeights";
import {
  useKvKWars,
  useCreateKvKWar,
  useUpdateKvKWar,
  useDeleteKvKWar,
  type KvKWar,
} from "@/hooks/useKvKWars";
import { useAuth } from "@/hooks/useAuth";
import {
  useKvKThresholds,
  useUpdateKvKThresholds,
  findTier,
  type PowerTier,
} from "@/hooks/useKvKThresholds";
import { fmt } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Swords,
  Shield,
  ArrowUpDown,
  Search,
  Star,
  Loader2,
  Settings2,
  Check,
  X,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Download,
  GripVertical,
  AlertTriangle,
  Gauge,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

/* ─── types ──────────────────────────────────────────────────── */

interface WarGains {
  t4_gained: number;
  t5_gained: number;
  kills_gained: number;
  deaths_gained: number;
  dkp: number;
}

interface KvKRow {
  governor_name: string;
  governor_id: string | null;
  alliance: string | null;
  power: number;
  killpoints: number;
  deaths: number;
  wars: Record<string, WarGains>;
  totalDkp: number;
}

type SortKey = "governor_name" | "totalDkp" | string;

/* ─── constants ──────────────────────────────────────────────── */

const WAR_COLORS = [
  "hsl(221, 83%, 53%)", // blue
  "hsl(142, 71%, 45%)", // green
  "hsl(38, 92%, 50%)",  // amber
  "hsl(0, 84%, 60%)",   // red
  "hsl(280, 68%, 60%)", // purple
  "hsl(190, 90%, 50%)", // cyan
  "hsl(330, 80%, 60%)", // pink
  "hsl(160, 60%, 45%)", // teal
];

const WAR_BG_COLORS = [
  "hsl(221, 83%, 53%, 0.06)", // blue
  "hsl(142, 71%, 45%, 0.06)", // green
  "hsl(38, 92%, 50%, 0.06)",  // amber
  "hsl(0, 84%, 60%, 0.06)",   // red
  "hsl(280, 68%, 60%, 0.06)", // purple
  "hsl(190, 90%, 50%, 0.06)", // cyan
  "hsl(330, 80%, 60%, 0.06)", // pink
  "hsl(160, 60%, 45%, 0.06)", // teal
];

/* ─── helpers ────────────────────────────────────────────────── */

function computeGains(
  beforeStats: GovernorStat[],
  afterStats: GovernorStat[],
  weights: DkpWeights,
): Map<string, WarGains> {
  const beforeMap = new Map<string, GovernorStat>();
  for (const g of beforeStats) beforeMap.set(g.governor_name, g);

  const map = new Map<string, WarGains>();
  for (const gTo of afterStats) {
    const gFrom = beforeMap.get(gTo.governor_name);
    const t4_gained = (gTo.t4_kills ?? 0) - (gFrom?.t4_kills ?? 0);
    const t5_gained = (gTo.t5_kills ?? 0) - (gFrom?.t5_kills ?? 0);
    const kills_gained = (gTo.total_kills ?? 0) - (gFrom?.total_kills ?? 0);
    const deaths_gained = (gTo.deaths ?? 0) - (gFrom?.deaths ?? 0);
    const dkp =
      t4_gained * weights.t4_kills +
      t5_gained * weights.t5_kills +
      deaths_gained * weights.deaths;
    map.set(gTo.governor_name, { t4_gained, t5_gained, kills_gained, deaths_gained, dkp });
  }
  return map;
}

function warColor(index: number) {
  return WAR_COLORS[index % WAR_COLORS.length];
}

function warBgColor(index: number) {
  return WAR_BG_COLORS[index % WAR_BG_COLORS.length];
}

/* ─── page component ─────────────────────────────────────────── */

export default function KvKPage() {
  const { data: snapshots, isLoading: snapsLoading } = useSnapshots("general");
  const { data: weights = DEFAULT_WEIGHTS } = useDkpWeights();
  const updateWeights = useUpdateDkpWeights();
  const { data: wars = [], isLoading: warsLoading } = useKvKWars();
  const createWar = useCreateKvKWar();
  const updateWar = useUpdateKvKWar();
  const deleteWar = useDeleteKvKWar();
  const { data: tiers = [], isLoading: tiersLoading } = useKvKThresholds();
  const updateTiers = useUpdateKvKThresholds();
  const { isAdmin } = useAuth();

  const [search, setSearch] = useState("");
  const [alliance, setAlliance] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("totalDkp");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [weightsOpen, setWeightsOpen] = useState(false);
  const [warsOpen, setWarsOpen] = useState(false);
  const [editWeights, setEditWeights] = useState<DkpWeights | null>(null);
  const [selectedGov, setSelectedGov] = useState<KvKRow | null>(null);
  const [newWarName, setNewWarName] = useState("");
  const [thresholdsOpen, setThresholdsOpen] = useState(false);
  const [editTiers, setEditTiers] = useState<PowerTier[] | null>(null);

  /* collect all snapshot ids needed for configured wars */
  const warSnapshotIds = useMemo(() => {
    const ids = new Set<string>();
    for (const w of wars) {
      if (w.snapshot_before_id) ids.add(w.snapshot_before_id);
      if (w.snapshot_after_id) ids.add(w.snapshot_after_id);
    }
    return [...ids];
  }, [wars]);

  const { data: allStats, isLoading: statsLoading } = useGovernorStatsMulti(warSnapshotIds);

  /* group stats by snapshot_id for O(1) lookups */
  const statsBySnapshot = useMemo(() => {
    const map = new Map<string, GovernorStat[]>();
    if (!allStats) return map;
    for (const s of allStats) {
      let arr = map.get(s.snapshot_id);
      if (!arr) { arr = []; map.set(s.snapshot_id, arr); }
      arr.push(s);
    }
    return map;
  }, [allStats]);

  /* per-war gains maps */
  const warGainsMaps = useMemo(() => {
    if (!allStats) return new Map<string, Map<string, WarGains>>();
    const result = new Map<string, Map<string, WarGains>>();
    for (const w of wars) {
      if (!w.snapshot_before_id || !w.snapshot_after_id) continue;
      const before = statsBySnapshot.get(w.snapshot_before_id) ?? [];
      const after = statsBySnapshot.get(w.snapshot_after_id) ?? [];
      if (before.length && after.length) {
        result.set(w.id, computeGains(before, after, weights));
      }
    }
    return result;
  }, [allStats, wars, weights, statsBySnapshot]);

  /* valid wars (those with both snapshots assigned and data computed) */
  const validWars = useMemo(
    () => wars.filter((w) => warGainsMaps.has(w.id)),
    [wars, warGainsMaps],
  );

  /* aggregate rows */
  const kvkRows = useMemo<KvKRow[]>(() => {
    if (!validWars.length || !allStats) return [];
    const govMap = new Map<string, KvKRow>();

    for (const w of validWars) {
      const gains = warGainsMaps.get(w.id)!;
      const afterStats = statsBySnapshot.get(w.snapshot_after_id!) ?? [];

      for (const gStat of afterStats) {
        if (!govMap.has(gStat.governor_name)) {
          govMap.set(gStat.governor_name, {
            governor_name: gStat.governor_name,
            governor_id: gStat.governor_id,
            alliance: gStat.alliance,
            power: gStat.power ?? 0,
            killpoints: gStat.killpoints ?? 0,
            deaths: gStat.deaths ?? 0,
            wars: {},
            totalDkp: 0,
          });
        }
        const row = govMap.get(gStat.governor_name)!;
        const g = gains.get(gStat.governor_name);
        if (g) {
          row.wars[w.id] = g;
          row.totalDkp += g.dkp;
        }
        row.power = Math.max(row.power, gStat.power ?? 0);
        row.killpoints = Math.max(row.killpoints, gStat.killpoints ?? 0);
        row.deaths = Math.max(row.deaths, gStat.deaths ?? 0);
        if (gStat.governor_id) row.governor_id = gStat.governor_id;
        if (gStat.alliance) row.alliance = gStat.alliance;
      }
    }

    return [...govMap.values()];
  }, [validWars, warGainsMaps, allStats, statsBySnapshot]);

  const alliances = useMemo(
    () => [...new Set(kvkRows.map((g) => g.alliance).filter(Boolean))],
    [kvkRows],
  );

  const filtered = useMemo(() => {
    let list = [...kvkRows];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (g) =>
          g.governor_name.toLowerCase().includes(q) ||
          (g.governor_id && g.governor_id.toLowerCase().includes(q)),
      );
    }
    if (alliance !== "all") list = list.filter((g) => g.alliance === alliance);

    list.sort((a, b) => {
      if (sortKey === "governor_name") {
        return sortDir === "desc"
          ? b.governor_name.localeCompare(a.governor_name)
          : a.governor_name.localeCompare(b.governor_name);
      }
      if (sortKey === "totalDkp") {
        return sortDir === "desc" ? b.totalDkp - a.totalDkp : a.totalDkp - b.totalDkp;
      }
      if (sortKey === "totalDeaths") {
        const ad = Object.values(a.wars).reduce((s, w) => s + w.deaths_gained, 0);
        const bd = Object.values(b.wars).reduce((s, w) => s + w.deaths_gained, 0);
        return sortDir === "desc" ? bd - ad : ad - bd;
      }
      if (sortKey.startsWith("war_")) {
        const warId = sortKey.slice(4);
        const av = a.wars[warId]?.dkp ?? 0;
        const bv = b.wars[warId]?.dkp ?? 0;
        return sortDir === "desc" ? bv - av : av - bv;
      }
      return 0;
    });
    return list;
  }, [kvkRows, search, alliance, sortKey, sortDir]);

  const totals = useMemo(
    () => ({
      dkp: kvkRows.reduce((s, g) => s + g.totalDkp, 0),
      kills: kvkRows.reduce(
        (s, g) => s + Object.values(g.wars).reduce((ws, w) => ws + w.kills_gained, 0),
        0,
      ),
      deaths: kvkRows.reduce(
        (s, g) => s + Object.values(g.wars).reduce((ws, w) => ws + w.deaths_gained, 0),
        0,
      ),
    }),
    [kvkRows],
  );

  /* per-war footer totals */
  const warTotals = useMemo(() => {
    const map: Record<string, { dkp: number; kills: number; deaths: number }> = {};
    for (const w of validWars) {
      map[w.id] = { dkp: 0, kills: 0, deaths: 0 };
    }
    for (const g of filtered) {
      for (const w of validWars) {
        const wg = g.wars[w.id];
        if (wg) {
          map[w.id].dkp += wg.dkp;
          map[w.id].kills += wg.kills_gained;
          map[w.id].deaths += wg.deaths_gained;
        }
      }
    }
    return map;
  }, [filtered, validWars]);

  /* stacked chart data: one bar segment per war */
  const chartData = useMemo(() => {
    return [...kvkRows]
      .sort((a, b) => b.totalDkp - a.totalDkp)
      .slice(0, 10)
      .map((g) => {
        const entry: Record<string, string | number> = { name: g.governor_name };
        for (const w of validWars) {
          entry[w.id] = g.wars[w.id]?.dkp ?? 0;
        }
        return entry;
      });
  }, [kvkRows, validWars]);

  /* ─── CSV export ─────────────────────────────────────────── */

  const downloadCSV = useCallback(() => {
    if (!filtered.length) return;

    const headers = ["#", "Governor", "ID", "Alliance"];
    for (const w of validWars) {
      headers.push(`${w.name} DKP`, `${w.name} Kills`, `${w.name} Deaths`);
    }
    headers.push("Total DKP", "Total Deaths", "Participation");

    const rows = filtered.map((g, i) => {
      const cells: (string | number)[] = [
        i + 1,
        g.governor_name,
        g.governor_id ?? "",
        g.alliance ?? "",
      ];
      for (const w of validWars) {
        const wg = g.wars[w.id];
        cells.push(wg?.dkp ?? 0, wg?.kills_gained ?? 0, wg?.deaths_gained ?? 0);
      }
      const participated = validWars.filter((w) => g.wars[w.id]).length;
      const totalDeaths = Object.values(g.wars).reduce((s, w) => s + w.deaths_gained, 0);
      cells.push(g.totalDkp, totalDeaths, `${participated}/${validWars.length}`);
      return cells;
    });

    const escape = (v: string | number) => {
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    const csv = [headers.map(escape).join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kvk_performance.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered, validWars]);

  /* ─── sorting / reorder helpers ────────────────────────────── */

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sortableHead = (label: string, key: SortKey, className?: string) => (
    <TableHead
      className={`cursor-pointer select-none hover:text-primary transition-colors ${className ?? ""}`}
      onClick={() => toggleSort(key)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className="h-3 w-3" />
      </span>
    </TableHead>
  );

  function handleAddWar() {
    if (!newWarName.trim()) return;
    createWar.mutate(
      { name: newWarName.trim(), snapshot_before_id: null, snapshot_after_id: null, sort_order: wars.length },
      { onSuccess: () => setNewWarName("") },
    );
  }

  function handleMoveWar(index: number, direction: "up" | "down") {
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= wars.length) return;
    const a = wars[index];
    const b = wars[swapIdx];
    updateWar.mutate({ id: a.id, sort_order: b.sort_order });
    updateWar.mutate({ id: b.id, sort_order: a.sort_order });
  }

  /* ─── loading & empty states ───────────────────────────────── */

  if (snapsLoading || warsLoading) {
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
        <p className="text-muted-foreground">
          No snapshots yet. Upload general governor data to start tracking KvK performance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">KvK Performance</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track individual war events &amp; compute DKP from snapshot diffs
        </p>
      </div>

      {/* DKP Formula badge + weights editor */}
      <Card className="border-border/60">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-center">
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
                    {(
                      [
                        { key: "t4_kills", label: "T4 Kills" },
                        { key: "t5_kills", label: "T5 Kills" },
                        { key: "deaths", label: "Deaths" },
                      ] as { key: keyof DkpWeights; label: string }[]
                    ).map(({ key, label }) => (
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
                      {updateWeights.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Check className="h-4 w-4 mr-1" />
                      )}
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
                    <Button size="sm" variant="outline" onClick={() => setEditWeights({ ...DEFAULT_WEIGHTS })}>
                      Reset to defaults
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      { key: "t4_kills", label: "T4 Kills" },
                      { key: "t5_kills", label: "T5 Kills" },
                      { key: "deaths", label: "Deaths" },
                    ] as { key: keyof DkpWeights; label: string }[]
                  ).map(({ key, label }) => (
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

      {/* ─── War Management ──────────────────────────────────── */}
      <Collapsible open={warsOpen} onOpenChange={setWarsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Swords className="h-4 w-4" />
            Manage Wars ({wars.length})
            <ChevronDown className={`h-4 w-4 transition-transform ${warsOpen ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-3">
          <Card className="border-border/60">
            <CardContent className="pt-6 space-y-4">
              {wars.map((w, idx) => (
                <WarEditor
                  key={w.id}
                  war={w}
                  index={idx}
                  colorDot={warColor(idx)}
                  snapshots={snapshots ?? []}
                  isAdmin={isAdmin}
                  isFirst={idx === 0}
                  isLast={idx === wars.length - 1}
                  onUpdate={(fields) => updateWar.mutate({ id: w.id, ...fields })}
                  onDelete={() => deleteWar.mutate(w.id)}
                  onMove={(dir) => handleMoveWar(idx, dir)}
                />
              ))}

              {isAdmin && (
                <div className="flex gap-2 items-center pt-2 border-t border-border/40">
                  <Input
                    placeholder="New war name (e.g. Pass 4 – Zone 5)"
                    value={newWarName}
                    onChange={(e) => setNewWarName(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => e.key === "Enter" && handleAddWar()}
                  />
                  <Button size="sm" onClick={handleAddWar} disabled={!newWarName.trim() || createWar.isPending}>
                    <Plus className="h-4 w-4 mr-1" /> Add War
                  </Button>
                </div>
              )}

              {!wars.length && (
                <p className="text-sm text-muted-foreground">
                  No wars created yet.{isAdmin ? " Add one above." : " Ask an admin to add war events."}
                </p>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* ─── Power Tier Thresholds ─────────────────────────────── */}
      <Collapsible open={thresholdsOpen} onOpenChange={setThresholdsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Gauge className="h-4 w-4" />
            Power Tier Thresholds ({tiers.length})
            <ChevronDown className={`h-4 w-4 transition-transform ${thresholdsOpen ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Gauge className="h-4 w-4" /> Minimum Requirements by Power
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Governors whose total DKP or deaths fall below their tier&apos;s minimum will be flagged in red.
              </p>
            </CardHeader>
            <CardContent>
              {isAdmin ? (
                <div className="space-y-3">
                  {(editTiers ?? tiers).map((tier, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Min Power</Label>
                        <Input
                          type="number"
                          min="0"
                          value={tier.min_power}
                          onChange={(e) => {
                            const arr = [...(editTiers ?? tiers)];
                            arr[idx] = { ...arr[idx], min_power: Number(e.target.value) || 0 };
                            setEditTiers(arr);
                          }}
                          className="h-9 bg-secondary border-border"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Min DKP</Label>
                        <Input
                          type="number"
                          min="0"
                          value={tier.min_dkp}
                          onChange={(e) => {
                            const arr = [...(editTiers ?? tiers)];
                            arr[idx] = { ...arr[idx], min_dkp: Number(e.target.value) || 0 };
                            setEditTiers(arr);
                          }}
                          className="h-9 bg-secondary border-border"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Min Deaths</Label>
                        <Input
                          type="number"
                          min="0"
                          value={tier.min_deaths}
                          onChange={(e) => {
                            const arr = [...(editTiers ?? tiers)];
                            arr[idx] = { ...arr[idx], min_deaths: Number(e.target.value) || 0 };
                            setEditTiers(arr);
                          }}
                          className="h-9 bg-secondary border-border"
                        />
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-destructive"
                        onClick={() => {
                          const arr = (editTiers ?? [...tiers]).filter((_, j) => j !== idx);
                          setEditTiers(arr);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditTiers([...(editTiers ?? tiers), { min_power: 0, min_dkp: 0, min_deaths: 0 }]);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Tier
                  </Button>
                  <div className="flex gap-2 pt-2 border-t border-border/40">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (editTiers) {
                          updateTiers.mutate(editTiers, {
                            onSuccess: () => {
                              setEditTiers(null);
                              setThresholdsOpen(false);
                            },
                          });
                        }
                      }}
                      disabled={!editTiers || updateTiers.isPending}
                    >
                      {updateTiers.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Check className="h-4 w-4 mr-1" />
                      )}
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditTiers(null);
                        setThresholdsOpen(false);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : tiers.length ? (
                <div className="space-y-2">
                  {tiers.map((tier, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Min Power</span>
                        <p className="font-semibold text-foreground">{fmt(tier.min_power)}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Min DKP</span>
                        <p className="font-semibold text-foreground">{fmt(tier.min_dkp)}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Min Deaths</span>
                        <p className="font-semibold text-foreground">{fmt(tier.min_deaths)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No thresholds configured.</p>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* ─── Data display ─────────────────────────────────────── */}
      {statsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !validWars.length ? (
        <p className="text-muted-foreground">
          {wars.length
            ? "Assign before/after snapshots to your wars to see performance data."
            : "Create and configure war events to see KvK performance data."}
        </p>
      ) : !kvkRows.length ? (
        <p className="text-muted-foreground">No matching governors between the selected snapshots.</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="card-hover border-border/60 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total DKP
                </CardTitle>
                <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Star className="h-4 w-4 text-violet-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold font-display tabular-nums">{fmt(totals.dkp)}</div>
              </CardContent>
            </Card>
            <Card className="card-hover border-border/60 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Kills Gained
                </CardTitle>
                <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                  <Swords className="h-4 w-4 text-rose-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold font-display tabular-nums">{fmt(totals.kills)}</div>
              </CardContent>
            </Card>
            <Card className="card-hover border-border/60 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Deaths Gained
                </CardTitle>
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-amber-500" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-extrabold font-display tabular-nums">{fmt(totals.deaths)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Stacked bar chart — one segment per war */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 by DKP</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      type="number"
                      tickFormatter={(v: number) => fmt(v)}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={100}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <RechartsTooltip
                      formatter={(v: number, name: string) => [fmt(v), name]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Legend />
                    {validWars.map((w, i) => (
                      <Bar
                        key={w.id}
                        dataKey={w.id}
                        stackId="dkp"
                        fill={warColor(i)}
                        name={w.name}
                        radius={i === validWars.length - 1 ? [0, 4, 4, 0] : undefined}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Filters + CSV export */}
          <div className="flex gap-3 flex-wrap items-center">
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
                  <SelectItem key={a!} value={a!}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-2 ml-auto" onClick={downloadCSV}>
              <Download className="h-4 w-4" />
              Download CSV
            </Button>
          </div>

          {/* Table */}
          <Card className="border-border/60 overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border">
                      <TableHead className="w-10">#</TableHead>
                      {sortableHead("Governor", "governor_name")}
                      <TableHead>Alliance</TableHead>
                      {validWars.map((w, i) => (
                        <TableHead
                          key={w.id}
                          className="cursor-pointer select-none hover:text-primary transition-colors text-center border-l border-border/40"
                          style={{ backgroundColor: warBgColor(i) }}
                          onClick={() => toggleSort(`war_${w.id}`)}
                        >
                          <span className="inline-flex items-center gap-1 text-xs">
                            <span
                              className="inline-block w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: warColor(i) }}
                            />
                            {w.name}
                            <ArrowUpDown className="h-3 w-3" />
                          </span>
                        </TableHead>
                      ))}
                      {sortableHead("Total DKP", "totalDkp", "border-l border-border/40")}
                      {sortableHead("Total Deaths", "totalDeaths")}
                      <TableHead className="text-center">Wars</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((g, i) => {
                      const participated = validWars.filter((w) => g.wars[w.id]).length;
                      const tier = findTier(g.power, tiers);
                      const totalDeaths = Object.values(g.wars).reduce((s, w) => s + w.deaths_gained, 0);
                      const dkpBelow = tier ? g.totalDkp < tier.min_dkp : false;
                      const deathsBelow = tier ? totalDeaths < tier.min_deaths : false;
                      return (
                        <TableRow
                          key={g.governor_name}
                          className="hover:bg-muted/30 transition-colors even:bg-muted/10"
                        >
                          <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                          <TableCell>
                            <button
                              onClick={() => setSelectedGov(g)}
                              className="font-semibold text-primary hover:underline cursor-pointer text-left text-sm"
                            >
                              {g.governor_name}
                            </button>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {g.alliance ?? "—"}
                          </TableCell>
                          {validWars.map((w, wi) => {
                            const wg = g.wars[w.id];
                            return (
                              <TableCell
                                key={w.id}
                                className="text-center border-l border-border/40 text-sm tabular-nums"
                                style={{ backgroundColor: warBgColor(wi) }}
                              >
                                {wg ? (
                                  <div>
                                    <span className="font-semibold" style={{ color: warColor(wi) }}>
                                      {fmt(wg.dkp)}
                                    </span>
                                    <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                                      K: {fmt(wg.kills_gained)} · D: {fmt(wg.deaths_gained)}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground/50">—</span>
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell className={`font-bold text-sm tabular-nums border-l border-border/40 ${dkpBelow ? "text-destructive" : "text-primary"}`}>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center gap-1">
                                    {dkpBelow && <AlertTriangle className="h-3.5 w-3.5" />}
                                    {fmt(g.totalDkp)}
                                  </span>
                                </TooltipTrigger>
                                {tier && (
                                  <TooltipContent>
                                    <p className="text-xs">Required DKP: {fmt(tier.min_dkp)}</p>
                                    <p className="text-xs">Actual: {fmt(g.totalDkp)}</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell className={`text-sm tabular-nums ${deathsBelow ? "text-destructive font-bold" : "text-muted-foreground"}`}>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center gap-1">
                                    {deathsBelow && <AlertTriangle className="h-3.5 w-3.5" />}
                                    {fmt(totalDeaths)}
                                  </span>
                                </TooltipTrigger>
                                {tier && (
                                  <TooltipContent>
                                    <p className="text-xs">Required Deaths: {fmt(tier.min_deaths)}</p>
                                    <p className="text-xs">Actual: {fmt(totalDeaths)}</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                          </TableCell>
                          <TableCell className="text-center text-xs tabular-nums">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                                participated === validWars.length
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : participated === 0
                                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              }`}
                            >
                              {participated}/{validWars.length}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  {/* Per-war totals footer */}
                  <TableFooter>
                    <TableRow className="bg-muted/60 font-semibold">
                      <TableCell />
                      <TableCell className="text-xs uppercase tracking-wider text-muted-foreground">
                        Totals
                      </TableCell>
                      <TableCell />
                      {validWars.map((w, wi) => {
                        const wt = warTotals[w.id];
                        return (
                          <TableCell
                            key={w.id}
                            className="text-center border-l border-border/40 text-sm tabular-nums"
                            style={{ backgroundColor: warBgColor(wi) }}
                          >
                            <div>
                              <span className="font-bold" style={{ color: warColor(wi) }}>
                                {fmt(wt?.dkp ?? 0)}
                              </span>
                              <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                                K: {fmt(wt?.kills ?? 0)} · D: {fmt(wt?.deaths ?? 0)}
                              </div>
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell className="font-bold text-primary text-sm tabular-nums border-l border-border/40">
                        {fmt(filtered.reduce((s, g) => s + g.totalDkp, 0))}
                      </TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">
                        {fmt(filtered.reduce((s, g) => s + Object.values(g.wars).reduce((ws, w) => ws + w.deaths_gained, 0), 0))}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Governor profile popup */}
          <GovernorProfileCard
            governor={selectedGov}
            onClose={() => setSelectedGov(null)}
            kvkData={
              selectedGov
                ? {
                    wars: validWars.map((w, i) => ({
                      id: w.id,
                      name: w.name,
                      color: warColor(i),
                      gains: selectedGov.wars[w.id],
                    })),
                    totalDkp: selectedGov.totalDkp,
                    tiers,
                    power: selectedGov.power,
                  }
                : undefined
            }
          />
        </>
      )}
    </div>
  );
}

/* ─── War Editor sub-component ───────────────────────────────── */

interface WarEditorProps {
  war: KvKWar;
  index: number;
  colorDot: string;
  snapshots: { id: string; label: string | null; snapshot_date: string }[];
  isAdmin: boolean;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (fields: Partial<KvKWar>) => void;
  onDelete: () => void;
  onMove: (direction: "up" | "down") => void;
}

function WarEditor({
  war,
  index,
  colorDot,
  snapshots,
  isAdmin,
  isFirst,
  isLast,
  onUpdate,
  onDelete,
  onMove,
}: WarEditorProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center p-3 rounded-lg bg-muted/30 border border-border/40">
      {/* Color dot + reorder controls */}
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-3 h-3 rounded-full shrink-0"
          style={{ backgroundColor: colorDot }}
        />
        {isAdmin && (
          <div className="flex flex-col">
            <button
              onClick={() => onMove("up")}
              disabled={isFirst}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onMove("down")}
              disabled={isLast}
              className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {isAdmin ? (
          <Input
            value={war.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="h-8 text-sm font-medium"
          />
        ) : (
          <span className="text-sm font-medium">{war.name}</span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Before:</span>
          {isAdmin ? (
            <Select
              value={war.snapshot_before_id ?? "none"}
              onValueChange={(v) => onUpdate({ snapshot_before_id: v === "none" ? null : v })}
            >
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {snapshots.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label || s.snapshot_date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-xs">
              {snapshots.find((s) => s.id === war.snapshot_before_id)?.label ??
                snapshots.find((s) => s.id === war.snapshot_before_id)?.snapshot_date ??
                "—"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground whitespace-nowrap">After:</span>
          {isAdmin ? (
            <Select
              value={war.snapshot_after_id ?? "none"}
              onValueChange={(v) => onUpdate({ snapshot_after_id: v === "none" ? null : v })}
            >
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— None —</SelectItem>
                {snapshots.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label || s.snapshot_date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-xs">
              {snapshots.find((s) => s.id === war.snapshot_after_id)?.label ??
                snapshots.find((s) => s.id === war.snapshot_after_id)?.snapshot_date ??
                "—"}
            </span>
          )}
        </div>

        {isAdmin && (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
