import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useKvKSnapshots, useKvKStats, calcKvKPoints, type KvKStat } from "@/hooks/useGovernorData";
import { fmt } from "@/lib/utils";
import { Swords, Shield, ArrowUpDown, Search, Star, Loader2 } from "lucide-react";
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

type SortKey = "governor_name" | "kvk_kills" | "kvk_deaths" | "kvk_points";

export default function KvKPage() {
  const { data: kvkSnapshots, isLoading: snapsLoading } = useKvKSnapshots();

  const [search, setSearch] = useState("");
  const [alliance, setAlliance] = useState("all");
  const [snapshotId, setSnapshotId] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("kvk_kills");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Auto-select the latest snapshot
  const resolvedSnapshotId = snapshotId || kvkSnapshots?.[kvkSnapshots.length - 1]?.id || "";

  const { data: governors = [], isLoading: statsLoading } = useKvKStats(resolvedSnapshotId);

  const alliances = useMemo(
    () => [...new Set(governors.map((g) => g.alliance).filter(Boolean))],
    [governors]
  );

  const filtered = useMemo(() => {
    let list = [...governors];
    if (search) list = list.filter((g) => g.governor_name.toLowerCase().includes(search.toLowerCase()));
    if (alliance !== "all") list = list.filter((g) => g.alliance === alliance);
    list.sort((a, b) => {
      let av: number, bv: number;
      if (sortKey === "kvk_points") { av = calcKvKPoints(a); bv = calcKvKPoints(b); }
      else if (sortKey === "governor_name") { return sortDir === "desc" ? b.governor_name.localeCompare(a.governor_name) : a.governor_name.localeCompare(b.governor_name); }
      else { av = (a[sortKey] ?? 0) as number; bv = (b[sortKey] ?? 0) as number; }
      return sortDir === "desc" ? bv - av : av - bv;
    });
    return list;
  }, [governors, search, alliance, sortKey, sortDir]);

  const totals = useMemo(() => ({
    kvkPoints: governors.reduce((s, g) => s + calcKvKPoints(g), 0),
    kvkKills: governors.reduce((s, g) => s + (g.kvk_kills ?? 0), 0),
    kvkDeaths: governors.reduce((s, g) => s + (g.kvk_deaths ?? 0), 0),
  }), [governors]);

  const chartData = useMemo(() => {
    return [...governors]
      .sort((a, b) => calcKvKPoints(b) - calcKvKPoints(a))
      .slice(0, 10)
      .map((g) => ({
        name: g.governor_name,
        kvkPoints: calcKvKPoints(g),
        kvkKills: g.kvk_kills ?? 0,
      }));
  }, [governors]);

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

  if (!kvkSnapshots?.length) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-bold text-primary">KvK Performance</h1>
        <p className="text-muted-foreground">No KvK snapshots yet. Upload KvK data to track performance.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-primary">KvK Performance</h1>
        <p className="text-muted-foreground mt-1">Track governor performance during Kill vs Kill events</p>
      </div>

      {/* Snapshot selector */}
      <Select value={resolvedSnapshotId} onValueChange={setSnapshotId}>
        <SelectTrigger className="w-72">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {kvkSnapshots.map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.label || s.snapshot_date} — {s.snapshot_date}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {statsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !governors.length ? (
        <p className="text-muted-foreground">No data for this snapshot.</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total KvK Points</CardTitle>
                <Star className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold font-display">{fmt(totals.kvkPoints)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">KvK Kills</CardTitle>
                <Swords className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold font-display">{fmt(totals.kvkKills)}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">KvK Deaths</CardTitle>
                <Shield className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold font-display">{fmt(totals.kvkDeaths)}</div></CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 by KvK Points</CardTitle>
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
                    <Bar dataKey="kvkPoints" fill="hsl(var(--primary))" name="KvK Points" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="kvkKills" fill="hsl(var(--accent))" name="KvK Kills" radius={[0, 4, 4, 0]} />
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
                placeholder="Search governor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
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
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Governor</TableHead>
                      <TableHead>Alliance</TableHead>
                      {sortableHead("KvK Points", "kvk_points")}
                      {sortableHead("KvK Kills", "kvk_kills")}
                      {sortableHead("KvK Deaths", "kvk_deaths")}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((g, i) => (
                      <TableRow key={g.id}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{g.governor_name}</TableCell>
                        <TableCell className="text-primary">{g.alliance ?? "—"}</TableCell>
                        <TableCell className="font-semibold text-primary">{fmt(calcKvKPoints(g))}</TableCell>
                        <TableCell>{fmt(g.kvk_kills ?? 0)}</TableCell>
                        <TableCell>{fmt(g.kvk_deaths ?? 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
