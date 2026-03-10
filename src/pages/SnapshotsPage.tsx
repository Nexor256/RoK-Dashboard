import { useState, useMemo } from "react";
import { useSnapshots, useGovernorStatsMulti, type GovernorStat, type SnapshotRow } from "@/hooks/useGovernorData";
import { fmt } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import GovernorProfileCard from "@/components/GovernorProfileCard";
import CompareContextMenuContent from "@/components/CompareContextMenuContent";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Minus, Loader2 } from "lucide-react";

function Delta({ value }: { value: number }) {
  if (value > 0) return <span className="text-emerald-500 font-semibold flex items-center gap-1 tabular-nums"><ArrowUp className="h-3 w-3" />+{fmt(value)}</span>;
  if (value < 0) return <span className="text-red-400 font-semibold flex items-center gap-1 tabular-nums"><ArrowDown className="h-3 w-3" />{fmt(value)}</span>;
  return <span className="text-muted-foreground flex items-center gap-1 tabular-nums"><Minus className="h-3 w-3" />0</span>;
}

export default function SnapshotsPage() {
  const { data: snapshots, isLoading: snapsLoading } = useSnapshots("general");
  const { governorId } = useAuth();

  const [snapA, setSnapA] = useState<string>("");
  const [snapB, setSnapB] = useState<string>("");
  const [selectedGov, setSelectedGov] = useState<typeof comparison[number] | null>(null);

  // Auto-select latest two snapshots once loaded
  const resolvedSnapA = snapA || snapshots?.[snapshots.length - 2]?.id || "";
  const resolvedSnapB = snapB || snapshots?.[snapshots.length - 1]?.id || "";

  const snapshotIds = useMemo(() => {
    const ids: string[] = [];
    if (resolvedSnapA) ids.push(resolvedSnapA);
    if (resolvedSnapB && resolvedSnapB !== resolvedSnapA) ids.push(resolvedSnapB);
    return ids;
  }, [resolvedSnapA, resolvedSnapB]);

  const { data: allStats, isLoading: statsLoading } = useGovernorStatsMulti(snapshotIds);

  const comparison = useMemo(() => {
    if (!allStats || !resolvedSnapA || !resolvedSnapB) return [];

    const statsA = allStats.filter((s) => s.snapshot_id === resolvedSnapA);
    const statsB = allStats.filter((s) => s.snapshot_id === resolvedSnapB);

    return statsB.map((gB) => {
      const gA = gB.governor_id
        ? statsA.find((g) => g.governor_id === gB.governor_id)
        : statsA.find((g) => g.governor_name === gB.governor_name);
      return {
        ...gB,
        power: gB.power ?? 0,
        killpoints: gB.killpoints ?? 0,
        deaths: gB.deaths ?? 0,
        powerA: gA?.power ?? 0,
        powerB: gB.power ?? 0,
        powerDelta: (gB.power ?? 0) - (gA?.power ?? 0),
        killsA: gA?.total_kills ?? 0,
        killsB: gB.total_kills ?? 0,
        killsDelta: (gB.total_kills ?? 0) - (gA?.total_kills ?? 0),
        kpA: gA?.killpoints ?? 0,
        kpB: gB.killpoints ?? 0,
        kpDelta: (gB.killpoints ?? 0) - (gA?.killpoints ?? 0),
      };
    }).sort((a, b) => b.powerDelta - a.powerDelta);
  }, [allStats, resolvedSnapA, resolvedSnapB]);

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
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight"><span className="text-gradient">Historical Snapshots</span></h1>
        <p className="text-muted-foreground">No snapshots yet. Upload governor data to start comparing.</p>
      </div>
    );
  }

  if (snapshots.length < 2) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight"><span className="text-gradient">Historical Snapshots</span></h1>
        <p className="text-muted-foreground">Upload at least two snapshots to compare them.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-transition">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
          <span className="text-gradient">Historical Snapshots</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Compare governor data across different snapshots</p>
      </div>

      <Card className="border-white/[0.06] glass-panel">
        <CardHeader>
          <CardTitle className="font-display text-lg">Compare Snapshots</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-start sm:items-center mb-6">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-sm font-medium text-muted-foreground">From:</span>
              <Select value={resolvedSnapA} onValueChange={setSnapA}>
                <SelectTrigger className="w-full sm:w-[220px] bg-white/[0.04] border-white/[0.06]">
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
              <span className="text-sm font-medium text-muted-foreground">To:</span>
              <Select value={resolvedSnapB} onValueChange={setSnapB}>
                <SelectTrigger className="w-full sm:w-[220px] bg-white/[0.04] border-white/[0.06]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {snapshots.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label || s.snapshot_date}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {statsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-lg border border-white/[0.06] overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow className="bg-white/[0.02] hover:bg-white/[0.02] border-b border-white/[0.06]">
                    <TableHead>Governor</TableHead>
                    <TableHead>Alliance</TableHead>
                    <TableHead>Power (From)</TableHead>
                    <TableHead>Power (To)</TableHead>
                    <TableHead>Δ Power</TableHead>
                    <TableHead>Kills (From)</TableHead>
                    <TableHead>Kills (To)</TableHead>
                    <TableHead>Δ Kills</TableHead>
                    <TableHead>Δ Kill Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparison.map((row) => {
                    const isMe = !!governorId && row.governor_id === governorId;
                    return (
                    <TableRow key={row.id} className={isMe ? "hover:bg-primary/10 transition-colors duration-200 border-l-2 border-l-primary bg-primary/5" : "hover:bg-white/[0.03] transition-colors duration-200 even:bg-white/[0.015]"}>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <ContextMenu>
                            <ContextMenuTrigger asChild>
                              <button
                                onClick={() => setSelectedGov(row)}
                                className="font-semibold text-primary hover:underline cursor-pointer text-left text-sm"
                              >
                                {row.governor_name}
                              </button>
                            </ContextMenuTrigger>
                            <CompareContextMenuContent gov={row} onViewProfile={() => setSelectedGov(row)} />
                          </ContextMenu>
                          {isMe && <Badge className="text-[10px] px-1.5 py-0 leading-4">You</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">{row.alliance ?? "—"}</span>
                      </TableCell>
                      <TableCell>{fmt(row.powerA)}</TableCell>
                      <TableCell>{fmt(row.powerB)}</TableCell>
                      <TableCell><Delta value={row.powerDelta} /></TableCell>
                      <TableCell>{fmt(row.killsA)}</TableCell>
                      <TableCell>{fmt(row.killsB)}</TableCell>
                      <TableCell><Delta value={row.killsDelta} /></TableCell>
                      <TableCell><Delta value={row.kpDelta} /></TableCell>
                    </TableRow>
                    );
                  })}
                  {!comparison.length && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                        No governor data found for the selected snapshots.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Governor profile popup */}
      <GovernorProfileCard
        governor={selectedGov}
        onClose={() => setSelectedGov(null)}
      />
    </div>
  );
}
