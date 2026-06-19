import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useLatestGovernorStats, usePreviousGovernorStats, type GovernorStat } from "@/hooks/useGovernorData";

import { useUserPreferences, useUpdateUserPreferences, type FilterPreset } from "@/hooks/useUserPreferences";
import { fmt } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, AnimatedTableBody, AnimatedTableRow
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
import { ArrowUpDown, ChevronLeft, ChevronRight, Download, Search, Loader2, TrendingUp, TrendingDown, Columns3, Palette, BookmarkPlus, Bookmark, X, TableProperties } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { SplitText } from "@/components/ui/SplitText";
import { ShinyText } from "@/components/ui/ShinyText";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useVirtualizer } from "@tanstack/react-virtual";


type SortKey =
  | "governor_name" | "alliance" | "power" | "t1_kills" | "t2_kills" | "t3_kills"
  | "t4_kills" | "t5_kills" | "total_kills" | "t45_kills" | "killpoints"
  | "deaths" | "ranged" | "resource_gathered" | "rss_assistance"
  | "helps" | "city_hall_level";

function getSortValue(g: GovernorStat, key: SortKey): number | string {
  if (key === "governor_name") return g.governor_name;
  if (key === "alliance") return g.alliance ?? "";
  return (g as unknown as Record<string, number | string>)[key] ?? 0;
}

/** Trend arrow + inline delta shown next to a stat when a previous snapshot value exists */
function Trend({ current, previous }: { current: number; previous: number | undefined }) {
  if (previous === undefined) return null;
  const delta = current - previous;
  if (delta === 0) return null;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums ${delta > 0 ? "text-emerald-500" : "text-red-400"}`}>
            {delta > 0
              ? <TrendingUp className="h-3 w-3" />
              : <TrendingDown className="h-3 w-3" />}
            {delta > 0 ? "+" : ""}{fmt(delta)}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Previous: {fmt(previous)}
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
  const governors = useMemo(() => data?.governors ?? [], [data?.governors]);
  const { data: prevData } = usePreviousGovernorStats();


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
  const [selectedGov, setSelectedGov] = useState<GovernorStat | null>(null);
  const [heatmapOn, setHeatmapOn] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<string[]>(DEFAULT_VISIBLE);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [activePreset, setActivePreset] = useState<string>("");

  // Clear the ?sort param after consuming it
  useEffect(() => {
    if (searchParams.has("sort")) {
      const next = new URLSearchParams(searchParams);
      next.delete("sort");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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

  // Virtualizer
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 44,
    overscan: 20,
  });

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
  }

  // Compute min/max for heatmap columns across the filtered set
  const heatRanges = useMemo(() => {
    const ranges: Record<string, { min: number; max: number }> = {};
    for (const key of HEATMAP_KEYS) {
      let min = Infinity, max = -Infinity;
      for (const g of filtered) {
        const v = (g as unknown as Record<string, number>)[key] ?? 0;
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
  }

  function deletePreset(name: string) {
    const updated = presets.filter((p) => p.name !== name);
    updatePrefs.mutate({ rankings_presets: updated });
    if (activePreset === name) setActivePreset("");
  }

  const columns = ALL_COLUMNS;

  if (isLoading) {
    return (
      <div className="space-y-5 page-transition">
        <div className="space-y-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-3 flex-wrap">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-32" />
        </div>
        <TableSkeleton rows={10} columns={6} />
      </div>
    );
  }

  if (!governors.length) {
    return (
      <div className="page-transition">
        <EmptyState
          title="No Rankings Yet"
          description="Upload a governor snapshot to see rankings and leaderboard data."
          icon={<TableProperties className="h-5 w-5 text-primary-foreground" />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 page-transition">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center">
          <span className="text-gradient"><SplitText text="Governor Rankings" /></span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          <ShinyText text="Detailed stats for all governors in the kingdom" speed={4} />
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name or ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
            className="pl-9 bg-white/[0.04] border-white/[0.06] focus:border-primary/50 transition-colors"
          />
        </div>
        <Select value={allianceFilter} onValueChange={(v) => { setAllianceFilter(v); }}>
          <SelectTrigger className="w-[160px] bg-white/[0.04] border-white/[0.06]">
            <SelectValue placeholder="All Alliances" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Alliances</SelectItem>
            {alliances.map((a) => (
              <SelectItem key={a!} value={a!}>[{a}]</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={downloadCSV} className="gap-1.5 rounded-lg border-white/[0.06] hover:bg-white/[0.06]">
          <Download className="h-4 w-4" /> Export CSV
        </Button>

        {/* Column visibility toggle */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-lg border-white/[0.06] hover:bg-white/[0.06]">
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
          className="gap-1.5 rounded-lg border-white/[0.06] hover:bg-white/[0.06]"
        >
          <Palette className="h-4 w-4" /> Heatmap
        </Button>

        {/* Presets dropdown */}
        {presets.length > 0 && (
          <Select value={activePreset} onValueChange={loadPreset}>
            <SelectTrigger className="w-[160px] bg-white/[0.04] border-white/[0.06]">
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
        <Button variant="outline" size="sm" onClick={() => setShowSavePreset(true)} className="gap-1.5 rounded-lg border-white/[0.06] hover:bg-white/[0.06]">
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
      <Card className="border-white/[0.06] overflow-hidden glass-panel">
        <div ref={tableContainerRef} className="overflow-auto scrollbar-hide max-h-[70vh]">
          <Table className="w-full sticky-header">
            <TableHeader>
              <TableRow className="bg-white/[0.02] hover:bg-white/[0.02] border-b border-white/[0.06]">
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

              </TableRow>
            </TableHeader>
            <TableBody>
              {rowVirtualizer.getVirtualItems().length === 0 && (
                <TableRow>
                  <TableCell colSpan={visibleColumns.length + 1} className="text-center text-muted-foreground py-8">
                    No governors match your filters.
                  </TableCell>
                </TableRow>
              )}
              {/* spacer top */}
              {rowVirtualizer.getVirtualItems().length > 0 && (
                <tr style={{ height: rowVirtualizer.getVirtualItems()[0]?.start ?? 0 }} />
              )}
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const g = filtered[virtualRow.index];
                const isMe = !!governorId && g.governor_id === governorId;
                return (
                  <TableRow
                    key={g.governor_id || g.governor_name}
                    data-index={virtualRow.index}
                    ref={rowVirtualizer.measureElement}
                    className={
                      isMe
                        ? "hover:bg-primary/10 transition-colors duration-200 border-l-2 border-l-primary bg-primary/5"
                        : "hover:bg-white/[0.03] transition-colors duration-200 even:bg-white/[0.015]"
                    }
                  >
                    <TableCell className="text-center text-muted-foreground text-xs font-medium">
                      {virtualRow.index + 1}
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
                              <div className="flex items-center gap-1.5">
                                {fmt(g.power ?? 0)}
                                <Trend current={g.power ?? 0} previous={prev?.power ?? undefined} />
                              </div>
                            </TableCell>
                          )}
                          {show("killpoints") && (
                            <TableCell className="text-primary font-semibold text-sm tabular-nums" style={hm("killpoints", g.killpoints ?? 0)}>
                              <div className="flex items-center gap-1.5">
                                {fmt(g.killpoints ?? 0)}
                                <Trend current={g.killpoints ?? 0} previous={prev?.killpoints ?? undefined} />
                              </div>
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

                        </>
                      );
                    })()}
                  </TableRow>
                );
              })}
              {/* spacer bottom */}
              {rowVirtualizer.getVirtualItems().length > 0 && (
                <tr style={{ height: rowVirtualizer.getTotalSize() - (rowVirtualizer.getVirtualItems()[rowVirtualizer.getVirtualItems().length - 1]?.end ?? 0) }} />
              )}
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

      {/* Row count */}
      <div className="text-sm text-muted-foreground">
        Showing <strong className="text-foreground">{filtered.length}</strong> governors
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
            className="bg-white/[0.04] border-white/[0.06] focus:border-primary/50 transition-colors"
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
