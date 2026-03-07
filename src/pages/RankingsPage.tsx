import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useLatestGovernorStats, usePreviousGovernorStats, type GovernorStat } from "@/hooks/useGovernorData";
import { useKvKThresholds, findTier } from "@/hooks/useKvKThresholds";
import { useUserPreferences, useUpdateUserPreferences, type FilterPreset } from "@/hooks/useUserPreferences";
import { fmt } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import GovernorProfileCard from "@/components/GovernorProfileCard";
import CompareContextMenuContent from "@/components/CompareContextMenuContent";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { ArrowUpDown, ChevronLeft, ChevronRight, Download, Search, Loader2, TrendingUp, TrendingDown, Columns3, Palette, BookmarkPlus, Bookmark, X } from "lucide-react";

type SortKey =
  | "governor_name" | "alliance" | "power" | "t1_kills" | "t2_kills" | "t3_kills"
  | "t4_kills" | "t5_kills" | "total_kills" | "t45_kills" | "killpoints"
  | "deaths" | "ranged" | "resource_gathered" | "rss_assistance"
  | "helps" | "city_hall_level";

function getSortValue(g: GovernorStat, key: SortKey): number | string {
  if (key === "governor_name") return g.governor_name;
  if (key === "alliance") return g.alliance ?? "";
  return (g as any)[key] ?? 0;
}

/** Trend arrow shown next to a stat when a previous snapshot value exists */
function Trend({ current, previous }: { current: number; previous: number | undefined }) {
  if (previous === undefined) return null;
  const delta = current - previous;
  if (delta === 0) return null;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center ml-1">
            {delta > 0
              ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              : <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {delta > 0 ? "+" : ""}{fmt(delta)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Colored progress bar toward a KvK goal */
function ProgressBar({ current, goal, label }: { current: number; goal: number; label: string }) {
  const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
  const passed = current >= goal;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-24 flex flex-col gap-0.5">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${passed ? "bg-emerald-500" : "bg-red-400"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className={`text-[10px] tabular-nums leading-none ${passed ? "text-emerald-600" : "text-red-500"}`}>
              {fmt(current)} / {fmt(goal)}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {label}: {pct.toFixed(0)}% — {passed ? "Goal met ✓" : `${fmt(goal - current)} remaining`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Columns that support heatmap coloring */
const HEATMAP_KEYS = new Set<string>(["power", "killpoints", "t4_kills", "t5_kills", "deaths"]);

/** Columns that are always visible and cannot be hidden */
const LOCKED_KEYS = new Set<string>(["governor_name", "alliance"]);

const ALL_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "governor_name", label: "Governor" },
  { key: "alliance", label: "Alliance" },
  { key: "power", label: "Power" },
  { key: "killpoints", label: "Kill Points" },
  { key: "t4_kills", label: "T4 Kills" },
  { key: "t5_kills", label: "T5 Kills" },
  { key: "t45_kills", label: "T4+5 Kills" },
  { key: "total_kills", label: "Total Kills" },
  { key: "deaths", label: "Deaths" },
  { key: "ranged", label: "Ranged" },
  { key: "resource_gathered", label: "RSS Gathered" },
  { key: "helps", label: "Helps" },
  { key: "city_hall_level", label: "CH Lvl" },
];

const DEFAULT_VISIBLE = ALL_COLUMNS.map((c) => c.key);

/** Compute a green heatmap background style for a value given a min/max range */
function heatmapStyle(value: number, min: number, max: number, isDark: boolean): React.CSSProperties | undefined {
  if (max === min) return undefined;
  const t = (value - min) / (max - min); // 0..1
  if (isDark) {
    // Dark mode: subtle green overlay
    return { backgroundColor: `hsla(142, 60%, 30%, ${0.05 + t * 0.35})` };
  }
  // Light mode: light to medium green
  const lightness = 95 - t * 30; // 95% (lightest) → 65% (darkest)
  return { backgroundColor: `hsl(142, 60%, ${lightness}%)` };
}

export default function RankingsPage() {
  const { data, isLoading } = useLatestGovernorStats();
  const governors = data?.governors ?? [];
  const { data: prevData } = usePreviousGovernorStats();
  const { data: tiers } = useKvKThresholds();
  const { governorId } = useAuth();
  const { data: prefs } = useUserPreferences();
  const updatePrefs = useUpdateUserPreferences();

  // Detect dark mode via the html class
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  // Map previous snapshot governor stats by governor_id for O(1) lookups
  const prevMap = useMemo(() => {
    const map = new Map<string, GovernorStat>();
    for (const g of prevData?.governors ?? []) {
      if (g.governor_id) map.set(g.governor_id, g);
    }
    return map;
  }, [prevData]);

  const [searchParams, setSearchParams] = useSearchParams();
  const initialSort = (searchParams.get("sort") as SortKey) || "power";

  const [search, setSearch] = useState("");
  const [allianceFilter, setAllianceFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>(initialSort);
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [selectedGov, setSelectedGov] = useState<GovernorStat | null>(null);
  const [heatmapOn, setHeatmapOn] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<string[]>(DEFAULT_VISIBLE);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [activePreset, setActivePreset] = useState<string>("");

  // Clear the ?sort param after consuming it
  useEffect(() => {
    if (searchParams.has("sort")) {
      searchParams.delete("sort");
      setSearchParams(searchParams, { replace: true });
    }
  }, []);

  // Sync column visibility from preferences on load
  useEffect(() => {
    if (prefs?.rankings_columns?.length) {
      setVisibleKeys(prefs.rankings_columns);
    }
  }, [prefs?.rankings_columns]);

  const presets = prefs?.rankings_presets ?? [];

  const toggleColumn = useCallback((key: string) => {
    setVisibleKeys((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      updatePrefs.mutate({ rankings_columns: next });
      return next;
    });
  }, [updatePrefs]);

  const visibleColumns = useMemo(
    () => ALL_COLUMNS.filter((c) => visibleKeys.includes(c.key)),
    [visibleKeys],
  );

  const alliances = useMemo(() => [...new Set(governors.map((g) => g.alliance).filter(Boolean))], [governors]);

  const filtered = useMemo(() => {
    let list = governors;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((g) => g.governor_name.toLowerCase().includes(q) || (g.governor_id && g.governor_id.toLowerCase().includes(q)));
    }
    if (allianceFilter !== "all") list = list.filter((g) => g.alliance === allianceFilter);

    list = [...list].sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      if (typeof av === "string" && typeof bv === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return list;
  }, [governors, search, allianceFilter, sortKey, sortAsc]);

  const paged = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  function downloadCSV() {
    const exportCols = visibleColumns;
    const header = exportCols.map((c) => c.label).join(",");
    const rows = filtered.map((g) =>
      exportCols.map((c) => {
        const v = g[c.key as keyof GovernorStat];
        if (c.key === "governor_name" || c.key === "alliance") return `"${String(v ?? "").replace(/"/g, '""')}"`;
        return v ?? "";
      }).join(",")
    );
    const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rankings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
    setPage(0);
  }

  // Compute min/max for heatmap columns across the filtered set
  const heatRanges = useMemo(() => {
    const ranges: Record<string, { min: number; max: number }> = {};
    for (const key of HEATMAP_KEYS) {
      let min = Infinity, max = -Infinity;
      for (const g of filtered) {
        const v = (g as any)[key] ?? 0;
        if (v < min) min = v;
        if (v > max) max = v;
      }
      ranges[key] = { min: min === Infinity ? 0 : min, max: max === -Infinity ? 0 : max };
    }
    return ranges;
  }, [filtered]);

  // Preset helpers
  function savePreset() {
    const trimmed = presetName.trim();
    if (!trimmed) return;
    const preset: FilterPreset = {
      name: trimmed,
      search,
      alliance: allianceFilter,
      sortKey,
      sortAsc,
      columns: visibleKeys,
    };
    const updated = [...presets.filter((p) => p.name !== trimmed), preset].slice(-10);
    updatePrefs.mutate({ rankings_presets: updated });
    setPresetName("");
    setShowSavePreset(false);
    setActivePreset(trimmed);
  }

  function loadPreset(name: string) {
    if (!name || name === "default") {
      // Reset to default
      setSearch("");
      setAllianceFilter("all");
      setSortKey("power");
      setSortAsc(false);
      setVisibleKeys(DEFAULT_VISIBLE);
      setActivePreset("");
      setPage(0);
      return;
    }
    const p = presets.find((pr) => pr.name === name);
    if (!p) return;
    setSearch(p.search ?? "");
    setAllianceFilter(p.alliance ?? "all");
    if (p.sortKey) setSortKey(p.sortKey as SortKey);
    setSortAsc(p.sortAsc ?? false);
    if (p.columns?.length) setVisibleKeys(p.columns);
    setActivePreset(name);
    setPage(0);
  }

  function deletePreset(name: string) {
    const updated = presets.filter((p) => p.name !== name);
    updatePrefs.mutate({ rankings_presets: updated });
    if (activePreset === name) setActivePreset("");
  }

  const columns = ALL_COLUMNS;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!governors.length) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-bold">Governor Rankings</h1>
        <p className="text-muted-foreground">No data yet. Upload a governor snapshot to see rankings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">Governor Rankings</h1>
        <p className="text-sm text-muted-foreground mt-1">Detailed stats for all governors in the kingdom</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name or ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9 bg-card border-border/60"
          />
        </div>
        <Select value={allianceFilter} onValueChange={(v) => { setAllianceFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px] bg-card border-border/60">
            <SelectValue placeholder="All Alliances" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Alliances</SelectItem>
            {alliances.map((a) => (
              <SelectItem key={a!} value={a!}>[{a}]</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(perPage)} onValueChange={(v) => { setPerPage(Number(v)); setPage(0); }}>
          <SelectTrigger className="w-[120px] bg-card border-border/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 15, 20].map((n) => (
              <SelectItem key={n} value={String(n)}>{n} rows</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={downloadCSV} className="gap-1.5 rounded-lg">
          <Download className="h-4 w-4" /> Export CSV
        </Button>

        {/* Column visibility toggle */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-lg">
              <Columns3 className="h-4 w-4" /> Columns
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-52 p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Show/Hide Columns</p>
            <div className="space-y-1.5">
              {ALL_COLUMNS.map((col) => {
                const locked = LOCKED_KEYS.has(col.key);
                return (
                  <label key={col.key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={visibleKeys.includes(col.key)}
                      disabled={locked}
                      onCheckedChange={() => toggleColumn(col.key)}
                    />
                    <span className={locked ? "text-muted-foreground" : ""}>{col.label}</span>
                  </label>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        {/* Heatmap toggle */}
        <Button
          variant={heatmapOn ? "default" : "outline"}
          size="sm"
          onClick={() => setHeatmapOn(!heatmapOn)}
          className="gap-1.5 rounded-lg"
        >
          <Palette className="h-4 w-4" /> Heatmap
        </Button>

        {/* Presets dropdown */}
        {presets.length > 0 && (
          <Select value={activePreset} onValueChange={loadPreset}>
            <SelectTrigger className="w-[160px] bg-card border-border/60">
              <Bookmark className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              <SelectValue placeholder="Presets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              {presets.map((p) => (
                <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Save preset */}
        <Button variant="outline" size="sm" onClick={() => setShowSavePreset(true)} className="gap-1.5 rounded-lg">
          <BookmarkPlus className="h-4 w-4" /> Save Preset
        </Button>
      </div>

      {/* Active preset indicator with delete */}
      {activePreset && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Active preset:</span>
          <span className="font-medium text-foreground">{activePreset}</span>
          <button onClick={() => deletePreset(activePreset)} className="text-muted-foreground hover:text-destructive transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Table */}
      <Card className="border-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border">
                <TableHead className="w-10 text-center">#</TableHead>
                {visibleColumns.map((col) => (
                  <TableHead key={col.key}>
                    <button
                      onClick={() => toggleSort(col.key)}
                      className="flex items-center gap-1 hover:text-foreground transition-colors text-xs font-semibold uppercase tracking-wider"
                    >
                      {col.label}
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                ))}
                {tiers?.length ? (
                  <>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Deaths Goal</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">KP Goal</TableHead>
                  </>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((g, i) => {
                const isMe = !!governorId && g.governor_id === governorId;
                return (
                <TableRow key={g.id} className={isMe ? "hover:bg-primary/10 transition-colors border-l-2 border-l-primary bg-primary/5" : "hover:bg-muted/30 transition-colors even:bg-muted/10"}>
                  <TableCell className="text-center text-muted-foreground text-xs font-medium">
                    {page * perPage + i + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                    <ContextMenu>
                      <ContextMenuTrigger asChild>
                        <button
                          onClick={() => setSelectedGov(g)}
                          className="font-semibold text-primary hover:underline cursor-pointer text-left text-sm"
                        >
                          {g.governor_name}
                        </button>
                      </ContextMenuTrigger>
                      <CompareContextMenuContent gov={g} onViewProfile={() => setSelectedGov(g)} />
                    </ContextMenu>
                    {isMe && <Badge className="text-[10px] px-1.5 py-0 leading-4">You</Badge>}
                    </div>
                  </TableCell>
                  {visibleKeys.includes("alliance") && (
                    <TableCell>
                      <span className="text-muted-foreground text-sm">{g.alliance ?? "—"}</span>
                    </TableCell>
                  )}
                  {(() => {
                    const prev = g.governor_id ? prevMap.get(g.governor_id) : undefined;
                    const tier = tiers?.length && g.power ? findTier(g.power, tiers) : null;
                    const show = (key: string) => visibleKeys.includes(key);
                    const hm = (key: string, value: number): React.CSSProperties | undefined => {
                      if (!heatmapOn || !HEATMAP_KEYS.has(key)) return undefined;
                      const r = heatRanges[key];
                      return r ? heatmapStyle(value, r.min, r.max, isDark) : undefined;
                    };
                    return (
                      <>
                        {show("power") && (
                          <TableCell className="font-semibold text-sm tabular-nums" style={hm("power", g.power ?? 0)}>
                            {fmt(g.power ?? 0)}
                            <Trend current={g.power ?? 0} previous={prev?.power ?? undefined} />
                          </TableCell>
                        )}
                        {show("killpoints") && (
                          <TableCell className="text-primary font-semibold text-sm tabular-nums" style={hm("killpoints", g.killpoints ?? 0)}>
                            {fmt(g.killpoints ?? 0)}
                            <Trend current={g.killpoints ?? 0} previous={prev?.killpoints ?? undefined} />
                          </TableCell>
                        )}
                        {show("t4_kills") && (
                          <TableCell className="text-sm tabular-nums" style={hm("t4_kills", g.t4_kills ?? 0)}>
                            {fmt(g.t4_kills ?? 0)}
                            <Trend current={g.t4_kills ?? 0} previous={prev?.t4_kills ?? undefined} />
                          </TableCell>
                        )}
                        {show("t5_kills") && (
                          <TableCell className="text-sm tabular-nums" style={hm("t5_kills", g.t5_kills ?? 0)}>
                            {fmt(g.t5_kills ?? 0)}
                            <Trend current={g.t5_kills ?? 0} previous={prev?.t5_kills ?? undefined} />
                          </TableCell>
                        )}
                        {show("t45_kills") && (
                          <TableCell className="text-sm tabular-nums">
                            {fmt(g.t45_kills ?? 0)}
                            <Trend current={g.t45_kills ?? 0} previous={prev?.t45_kills ?? undefined} />
                          </TableCell>
                        )}
                        {show("total_kills") && (
                          <TableCell className="text-sm tabular-nums">
                            {fmt(g.total_kills ?? 0)}
                            <Trend current={g.total_kills ?? 0} previous={prev?.total_kills ?? undefined} />
                          </TableCell>
                        )}
                        {show("deaths") && (
                          <TableCell className="text-sm tabular-nums" style={hm("deaths", g.deaths ?? 0)}>
                            {fmt(g.deaths ?? 0)}
                            <Trend current={g.deaths ?? 0} previous={prev?.deaths ?? undefined} />
                          </TableCell>
                        )}
                        {show("ranged") && (
                          <TableCell className="text-sm tabular-nums">{fmt(g.ranged ?? 0)}</TableCell>
                        )}
                        {show("resource_gathered") && (
                          <TableCell className="text-sm tabular-nums">
                            {fmt(g.resource_gathered ?? 0)}
                            <Trend current={g.resource_gathered ?? 0} previous={prev?.resource_gathered ?? undefined} />
                          </TableCell>
                        )}
                        {show("helps") && (
                          <TableCell className="text-sm tabular-nums">{fmt(g.helps ?? 0)}</TableCell>
                        )}
                        {show("city_hall_level") && (
                          <TableCell className="text-sm">{g.city_hall_level ?? "—"}</TableCell>
                        )}
                        {tier && (
                          <>
                            <TableCell>
                              <ProgressBar current={g.deaths ?? 0} goal={tier.min_deaths} label="Deaths" />
                            </TableCell>
                            <TableCell>
                              <ProgressBar current={g.killpoints ?? 0} goal={tier.min_dkp} label="Kill Points" />
                            </TableCell>
                          </>
                        )}
                      </>
                    );
                  })()}
                </TableRow>
              );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Governor profile popup */}
      <GovernorProfileCard
        governor={selectedGov}
        allGovernors={governors}
        onClose={() => setSelectedGov(null)}
      />

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>Showing <strong className="text-foreground">{page * perPage + 1}–{Math.min((page + 1) * perPage, filtered.length)}</strong> of {filtered.length}</span>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-lg">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} className="rounded-lg">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Save Preset Dialog */}
      <Dialog open={showSavePreset} onOpenChange={setShowSavePreset}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Filter Preset</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Save the current search, alliance filter, sort order, and visible columns as a reusable preset.</p>
          <Input
            placeholder="Preset name"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            maxLength={50}
            className="bg-card border-border/60"
            onKeyDown={(e) => e.key === "Enter" && savePreset()}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setShowSavePreset(false); setPresetName(""); }}>Cancel</Button>
            <Button size="sm" disabled={!presetName.trim()} onClick={savePreset}>
              <BookmarkPlus className="h-4 w-4 mr-1" /> Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
