import { useState, useMemo } from "react";
import { snapshots, calcDKP } from "@/data/governors";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return n.toString();
}

function Delta({ value }: { value: number }) {
  if (value > 0) return <span className="text-success flex items-center gap-1"><ArrowUp className="h-3 w-3" />+{fmt(value)}</span>;
  if (value < 0) return <span className="text-danger flex items-center gap-1"><ArrowDown className="h-3 w-3" />{fmt(value)}</span>;
  return <span className="text-muted-foreground flex items-center gap-1"><Minus className="h-3 w-3" />0</span>;
}

export default function SnapshotsPage() {
  const [snapA, setSnapA] = useState(snapshots[snapshots.length - 2].id);
  const [snapB, setSnapB] = useState(snapshots[snapshots.length - 1].id);

  const comparison = useMemo(() => {
    const a = snapshots.find((s) => s.id === snapA)!;
    const b = snapshots.find((s) => s.id === snapB)!;

    return b.governors.map((gB) => {
      const gA = a.governors.find((g) => g.id === gB.id);
      return {
        id: gB.id,
        name: gB.name,
        alliance: gB.alliance,
        powerA: gA?.power ?? 0,
        powerB: gB.power,
        powerDelta: gB.power - (gA?.power ?? 0),
        killsA: (gA?.t4Kills ?? 0) + (gA?.t5Kills ?? 0),
        killsB: gB.t4Kills + gB.t5Kills,
        killsDelta: (gB.t4Kills + gB.t5Kills) - ((gA?.t4Kills ?? 0) + (gA?.t5Kills ?? 0)),
        dkpA: gA ? calcDKP(gA) : 0,
        dkpB: calcDKP(gB),
        dkpDelta: calcDKP(gB) - (gA ? calcDKP(gA) : 0),
      };
    }).sort((a, b) => b.powerDelta - a.powerDelta);
  }, [snapA, snapB]);

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
              <Select value={snapA} onValueChange={setSnapA}>
                <SelectTrigger className="w-[180px] bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {snapshots.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.date}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">To:</span>
              <Select value={snapB} onValueChange={setSnapB}>
                <SelectTrigger className="w-[180px] bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {snapshots.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.date}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
                  <TableHead>Δ DKP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparison.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/30">
                    <TableCell>
                      <span className="font-medium">{row.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">[{row.alliance}]</span>
                    </TableCell>
                    <TableCell>{fmt(row.powerA)}</TableCell>
                    <TableCell>{fmt(row.powerB)}</TableCell>
                    <TableCell><Delta value={row.powerDelta} /></TableCell>
                    <TableCell>{fmt(row.killsA)}</TableCell>
                    <TableCell>{fmt(row.killsB)}</TableCell>
                    <TableCell><Delta value={row.killsDelta} /></TableCell>
                    <TableCell><Delta value={row.dkpDelta} /></TableCell>
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
