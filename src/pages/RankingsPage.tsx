import { useState, useMemo } from "react";
import { currentGovernors, calcDKP } from "@/data/governors";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";

function fmt(n: number) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

type SortKey = "name" | "power" | "t4Kills" | "t5Kills" | "deaths" | "deadTroops" | "healed" | "dkp" | "powerGrowth";

const alliances = [...new Set(currentGovernors.map((g) => g.alliance))];

export default function RankingsPage() {
  const [search, setSearch] = useState("");
  const [allianceFilter, setAllianceFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("power");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(10);

  const filtered = useMemo(() => {
    let list = currentGovernors;
    if (search) list = list.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));
    if (allianceFilter !== "all") list = list.filter((g) => g.alliance === allianceFilter);

    list = [...list].sort((a, b) => {
      const av = sortKey === "dkp" ? calcDKP(a) : (a as any)[sortKey];
      const bv = sortKey === "dkp" ? calcDKP(b) : (b as any)[sortKey];
      if (typeof av === "string") return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? av - bv : bv - av;
    });
    return list;
  }, [search, allianceFilter, sortKey, sortAsc]);

  const paged = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
    setPage(0);
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: "name", label: "Governor" },
    { key: "power", label: "Power" },
    { key: "t4Kills", label: "T4 Kills" },
    { key: "t5Kills", label: "T5 Kills" },
    { key: "deaths", label: "Deaths" },
    { key: "deadTroops", label: "Dead Troops" },
    { key: "healed", label: "Healed" },
    { key: "dkp", label: "DKP" },
    { key: "powerGrowth", label: "Growth" },
  ];

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
              <SelectItem key={a} value={a}>[{a}]</SelectItem>
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
                  <div>
                    <span className="font-medium text-foreground">{g.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">[{g.alliance}]</span>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{fmt(g.power)}</TableCell>
                <TableCell>{fmt(g.t4Kills)}</TableCell>
                <TableCell>{fmt(g.t5Kills)}</TableCell>
                <TableCell>{fmt(g.deaths)}</TableCell>
                <TableCell>{fmt(g.deadTroops)}</TableCell>
                <TableCell>{fmt(g.healed)}</TableCell>
                <TableCell className="text-primary font-semibold">{fmt(calcDKP(g))}</TableCell>
                <TableCell>
                  <span className={g.powerGrowth >= 0 ? "text-success" : "text-danger"}>
                    {g.powerGrowth >= 0 ? "+" : ""}{fmt(g.powerGrowth)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
