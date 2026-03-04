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
import { ArrowUp, ArrowDown, Minus, Loader2 } from "lucide-react";

function Delta({ value }: { value: number }) {
  if (value > 0) return <span className="text-success flex items-center gap-1"><ArrowUp className="h-3 w-3" />+{fmt(value)}</span>;
  if (value < 0) return <span className="text-danger flex items-center gap-1"><ArrowDown className="h-3 w-3" />{fmt(value)}</span>;
  return <span className="text-muted-foreground flex items-center gap-1"><Minus className="h-3 w-3" />0</span>;
}

export default function SnapshotsPage() {
  const { data: snapshots, isLoading: snapsLoading } = useSnapshots("general");

  const [snapA, setSnapA] = useState<string>("");
  const [snapB, setSnapB] = useState<string>("");

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
      const gA = statsA.find((g) => g.governor_name === gB.governor_name);
      return {
        id: gB.id,
        governor_name: gB.governor_name,
        alliance: gB.alliance,
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
        <h1 className="font-display text-3xl font-bold">Historical Snapshots</h1>
        <p className="text-muted-foreground">No snapshots yet. Upload governor data to start comparing.</p>
      </div>
    );
  }

  if (snapshots.length < 2) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-bold">Historical Snapshots</h1>
        <p className="text-muted-foreground">Upload at least two snapshots to compare them.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold">Historical Snapshots</h1>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="font-display text-lg">Compare Snapshots</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center mb-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">From:</span>
              <Select value={resolvedSnapA} onValueChange={setSnapA}>
                <SelectTrigger className="w-[220px] bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {snapshots.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.label || s.snapshot_date}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">To:</span>
              <Select value={resolvedSnapB} onValueChange={setSnapB}>
                <SelectTrigger className="w-[220px] bg-secondary border-border">
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
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50 hover:bg-secondary/50">
                    <TableHead>Governor</TableHead>
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
                  {comparison.map((row) => (
                    <TableRow key={row.id} className="hover:bg-muted/30">
                      <TableCell>
                        <span className="font-medium">{row.governor_name}</span>
                        <span className="ml-2 text-xs text-muted-foreground">[{row.alliance ?? "—"}]</span>
                      </TableCell>
                      <TableCell>{fmt(row.powerA)}</TableCell>
                      <TableCell>{fmt(row.powerB)}</TableCell>
                      <TableCell><Delta value={row.powerDelta} /></TableCell>
                      <TableCell>{fmt(row.killsA)}</TableCell>
                      <TableCell>{fmt(row.killsB)}</TableCell>
                      <TableCell><Delta value={row.killsDelta} /></TableCell>
                      <TableCell><Delta value={row.kpDelta} /></TableCell>
                    </TableRow>
                  ))}
                  {!comparison.length && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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
    </div>
  );
}
