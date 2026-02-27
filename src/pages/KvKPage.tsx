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
import { currentKvKGovernors, kvkSnapshots, type KvKGovernor } from "@/data/governors";
import { Swords, Trophy, Flag, Shield, ArrowUpDown, Search } from "lucide-react";
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

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

type SortKey = keyof KvKGovernor;

export default function KvKPage() {
  const [search, setSearch] = useState("");
  const [alliance, setAlliance] = useState("all");
  const [snapshot, setSnapshot] = useState(kvkSnapshots[kvkSnapshots.length - 1].id);
  const [sortKey, setSortKey] = useState<SortKey>("honor");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const governors = useMemo(() => {
    const snap = kvkSnapshots.find((s) => s.id === snapshot);
    return snap ? snap.governors : currentKvKGovernors;
  }, [snapshot]);

  const alliances = useMemo(() => [...new Set(governors.map((g) => g.alliance))], [governors]);

  const filtered = useMemo(() => {
    let list = [...governors];
    if (search) list = list.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));
    if (alliance !== "all") list = list.filter((g) => g.alliance === alliance);
    list.sort((a, b) => {
      const av = a[sortKey] as number;
      const bv = b[sortKey] as number;
      return sortDir === "desc" ? bv - av : av - bv;
    });
    return list;
  }, [governors, search, alliance, sortKey, sortDir]);

  const totals = useMemo(() => {
    return {
      honor: governors.reduce((s, g) => s + g.honor, 0),
      contribution: governors.reduce((s, g) => s + g.contribution, 0),
      passes: governors.reduce((s, g) => s + g.passesUsed, 0),
      kvkKills: governors.reduce((s, g) => s + g.kvkKills, 0),
    };
  }, [governors]);

  const chartData = useMemo(() => {
    return [...governors]
      .sort((a, b) => b.honor - a.honor)
      .slice(0, 10)
      .map((g) => ({
        name: g.name,
        honor: g.honor,
        contribution: g.contribution,
        kvkKills: g.kvkKills,
      }));
  }, [governors]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-primary">KvK Performance</h1>
        <p className="text-muted-foreground mt-1">Track governor performance during Kill vs Kill events</p>
      </div>

      {/* Snapshot selector */}
      <Select value={snapshot} onValueChange={setSnapshot}>
        <SelectTrigger className="w-72">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {kvkSnapshots.map((s) => (
            <SelectItem key={s.id} value={s.id}>{s.label} — {s.date}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Honor</CardTitle>
            <Trophy className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold font-display">{fmt(totals.honor)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Contribution</CardTitle>
            <Flag className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold font-display">{fmt(totals.contribution)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Passes Used</CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold font-display">{totals.passes}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">KvK Kills</CardTitle>
            <Swords className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold font-display">{fmt(totals.kvkKills)}</div></CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 by Honor</CardTitle>
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
                <Bar dataKey="honor" fill="hsl(var(--primary))" name="Honor" radius={[0, 4, 4, 0]} />
                <Bar dataKey="contribution" fill="hsl(var(--accent))" name="Contribution" radius={[0, 4, 4, 0]} />
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
              <SelectItem key={a} value={a}>{a}</SelectItem>
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
                  {sortableHead("Honor", "honor")}
                  {sortableHead("Contribution", "contribution")}
                  {sortableHead("Passes", "passesUsed")}
                  {sortableHead("Rallies", "ralliesJoined")}
                  {sortableHead("Garrisons", "garrisonsJoined")}
                  {sortableHead("KvK Kills", "kvkKills")}
                  {sortableHead("KvK Deaths", "kvkDeaths")}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((g, i) => (
                  <TableRow key={g.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{g.name}</TableCell>
                    <TableCell className="text-primary">{g.alliance}</TableCell>
                    <TableCell>{fmt(g.honor)}</TableCell>
                    <TableCell>{fmt(g.contribution)}</TableCell>
                    <TableCell>{g.passesUsed}</TableCell>
                    <TableCell>{g.ralliesJoined}</TableCell>
                    <TableCell>{g.garrisonsJoined}</TableCell>
                    <TableCell>{fmt(g.kvkKills)}</TableCell>
                    <TableCell>{fmt(g.kvkDeaths)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
