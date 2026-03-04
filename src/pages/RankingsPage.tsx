import { useState, useMemo } from "react";
import { useLatestGovernorStats, type GovernorStat } from "@/hooks/useGovernorData";
import { fmt } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ArrowUpDown, ChevronLeft, ChevronRight, Download, Search, Loader2 } from "lucide-react";

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

export default function RankingsPage() {
  const { data, isLoading } = useLatestGovernorStats();
  const governors = data?.governors ?? [];

  const [search, setSearch] = useState("");
  const [allianceFilter, setAllianceFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("power");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [selectedGov, setSelectedGov] = useState<GovernorStat | null>(null);

  const alliances = useMemo(() => [...new Set(governors.map((g) => g.alliance).filter(Boolean))], [governors]);

  const filtered = useMemo(() => {
    let list = governors;
    if (search) list = list.filter((g) => g.governor_name.toLowerCase().includes(search.toLowerCase()));
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
    const header = columns.map((c) => c.label).join(",");
    const rows = filtered.map((g) =>
      columns.map((c) => {
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

  const columns: { key: SortKey; label: string }[] = [
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
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-bold">Governor Rankings</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search governor..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9 bg-card border-border"
          />
        </div>
        <Select value={allianceFilter} onValueChange={(v) => { setAllianceFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px] bg-card border-border">
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
          <SelectTrigger className="w-[120px] bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 15, 20].map((n) => (
              <SelectItem key={n} value={String(n)}>{n} rows</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={downloadCSV} className="gap-1">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="w-10 text-center">#</TableHead>
              {columns.map((col) => (
                <TableHead key={col.key}>
                  <button
                    onClick={() => toggleSort(col.key)}
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    {col.label}
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((g, i) => (
              <TableRow key={g.id} className="hover:bg-muted/30">
                <TableCell className="text-center text-muted-foreground font-medium">
                  {page * perPage + i + 1}
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => setSelectedGov(g)}
                    className="font-medium text-primary hover:underline cursor-pointer text-left"
                  >
                    {g.governor_name}
                  </button>
                </TableCell>
                <TableCell>
                  <span className="text-muted-foreground">{g.alliance ?? "—"}</span>
                </TableCell>
                <TableCell className="font-medium">{fmt(g.power ?? 0)}</TableCell>
                <TableCell className="text-primary font-semibold">{fmt(g.killpoints ?? 0)}</TableCell>
                <TableCell>{fmt(g.t4_kills ?? 0)}</TableCell>
                <TableCell>{fmt(g.t5_kills ?? 0)}</TableCell>
                <TableCell>{fmt(g.t45_kills ?? 0)}</TableCell>
                <TableCell>{fmt(g.total_kills ?? 0)}</TableCell>
                <TableCell>{fmt(g.deaths ?? 0)}</TableCell>
                <TableCell>{fmt(g.ranged ?? 0)}</TableCell>
                <TableCell>{fmt(g.resource_gathered ?? 0)}</TableCell>
                <TableCell>{fmt(g.helps ?? 0)}</TableCell>
                <TableCell>{g.city_hall_level ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
                <p className="font-semibold text-foreground">{fmt(selectedGov.power ?? 0)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Kill Points</p>
                <p className="font-semibold text-primary">{fmt(selectedGov.killpoints ?? 0)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Deaths</p>
                <p className="font-semibold text-foreground">{fmt(selectedGov.deaths ?? 0)}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing {page * perPage + 1}–{Math.min((page + 1) * perPage, filtered.length)} of {filtered.length}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
