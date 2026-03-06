import { useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Trash2, GitCompareArrows } from "lucide-react";
import { useCompare } from "@/hooks/useCompare";
import { useGovernorHistory, type GovernorHistoryPoint } from "@/hooks/useGovernorData";
import type { GovernorProfileGov } from "@/components/GovernorProfileCard";
import { fmt } from "@/lib/utils";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444"];

/* ─── Floating Tray ─────────────────────────────────────────── */

export function CompareTray() {
  const { compareSet, removeFromCompare, clearCompare, openDrawer } = useCompare();

  if (compareSet.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/60 bg-background/95 backdrop-blur shadow-lg">
      {compareSet.map((g, i) => (
        <Badge key={g.governor_id} variant="secondary" className="gap-1 pr-1" style={{ borderColor: COLORS[i] }}>
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: COLORS[i] }} />
          {g.governor_name}
          <button
            onClick={() => removeFromCompare(g.governor_id!)}
            className="ml-0.5 hover:text-destructive rounded-full"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Button size="sm" onClick={openDrawer} className="gap-1.5 ml-1">
        <GitCompareArrows className="h-3.5 w-3.5" />
        Compare ({compareSet.length})
      </Button>
      <Button size="sm" variant="ghost" onClick={clearCompare} className="text-muted-foreground h-7 w-7 p-0">
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

/* ─── Drawer ─────────────────────────────────────────────────── */

export default function CompareDrawer() {
  const { compareSet, removeFromCompare, clearCompare, drawerOpen, closeDrawer } = useCompare();

  return (
    <Sheet open={drawerOpen} onOpenChange={(open) => { if (!open) closeDrawer(); }}>
      <SheetContent side="right" className="sm:max-w-2xl w-full overflow-y-auto p-0">
        <div className="p-6 space-y-6">
          <SheetHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <SheetTitle className="text-lg">Compare Governors</SheetTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{compareSet.length} selected</Badge>
              <Button size="sm" variant="ghost" onClick={clearCompare} className="text-muted-foreground gap-1 h-7 text-xs">
                <Trash2 className="h-3 w-3" /> Clear
              </Button>
            </div>
          </SheetHeader>

          {/* Governor chips */}
          <div className="flex flex-wrap gap-2">
            {compareSet.map((g, i) => (
              <Badge key={g.governor_id} variant="secondary" className="gap-1.5 pr-1 text-sm" style={{ borderColor: COLORS[i] }}>
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: COLORS[i] }} />
                {g.governor_name}
                <button onClick={() => removeFromCompare(g.governor_id!)} className="ml-0.5 hover:text-destructive rounded-full">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>

          {compareSet.length < 2 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Add at least 2 governors to compare. Right-click a governor name to add.
            </p>
          ) : (
            <>
              <StatsBarChart governors={compareSet} />
              <HistoryCharts governors={compareSet} />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ─── Grouped Bar Chart (current snapshot stats) ─────────────── */

const STAT_KEYS = [
  { key: "power", label: "Power" },
  { key: "killpoints", label: "Kill Points" },
  { key: "t4_kills", label: "T4 Kills" },
  { key: "t5_kills", label: "T5 Kills" },
  { key: "deaths", label: "Deaths" },
  { key: "resource_gathered", label: "RSS" },
] as const;

function StatsBarChart({ governors }: { governors: GovernorProfileGov[] }) {
  const data = useMemo(() => {
    return STAT_KEYS.map(({ key, label }) => {
      const row: Record<string, string | number> = { stat: label };
      governors.forEach((g: any) => {
        row[g.governor_name] = (g as any)[key] ?? 0;
      });
      return row;
    });
  }, [governors]);

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Current Stats
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical" margin={{ left: 70 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v: number) => fmt(v)} />
          <YAxis type="category" dataKey="stat" tick={{ fontSize: 11 }} width={65} />
          <Tooltip formatter={(v: number) => fmt(v)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {governors.map((g: any, i: number) => (
            <Bar key={g.governor_id} dataKey={g.governor_name} fill={COLORS[i]} radius={[0, 3, 3, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Overlaid History Line Charts ───────────────────────────── */

function HistoryCharts({ governors }: { governors: any[] }) {
  // Fetch history for each governor
  const h0 = useGovernorHistory(governors[0]?.governor_id ?? null);
  const h1 = useGovernorHistory(governors[1]?.governor_id ?? null);
  const h2 = useGovernorHistory(governors[2]?.governor_id ?? null);
  const h3 = useGovernorHistory(governors[3]?.governor_id ?? null);

  const histories = useMemo(() => {
    const all: (GovernorHistoryPoint[] | undefined)[] = [h0.data, h1.data, h2.data, h3.data];
    return governors.map((_, i) => all[i]);
  }, [governors, h0.data, h1.data, h2.data, h3.data]);

  // Merge by snapshot_date
  const powerData = useMemo(() => mergeHistories(governors, histories, "power"), [governors, histories]);
  const killsData = useMemo(() => mergeHistories(governors, histories, "killpoints"), [governors, histories]);

  const isLoading = [h0, h1, h2, h3].slice(0, governors.length).some((h) => h.isLoading);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground text-center py-4">Loading history...</p>;
  }

  return (
    <div className="space-y-6">
      <OverlaidLineChart title="Power Over Time" data={powerData} governors={governors} />
      <OverlaidLineChart title="Kill Points Over Time" data={killsData} governors={governors} />
    </div>
  );
}

function mergeHistories(
  governors: any[],
  histories: (GovernorHistoryPoint[] | undefined)[],
  key: "power" | "killpoints",
) {
  const dateMap = new Map<string, Record<string, string | number | null>>();

  governors.forEach((g, i) => {
    const hist = histories[i];
    if (!hist) return;
    hist.forEach((h) => {
      const date = h.snapshot_label || h.snapshot_date;
      if (!dateMap.has(date)) dateMap.set(date, { date });
      dateMap.get(date)![g.governor_name] = (h as any)[key] ?? 0;
    });
  });

  return Array.from(dateMap.values()).sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );
}

function OverlaidLineChart({
  title,
  data,
  governors,
}: {
  title: string;
  data: Record<string, any>[];
  governors: any[];
}) {
  if (!data.length) return null;

  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        {title}
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => fmt(v)} />
          <Tooltip formatter={(v: number) => fmt(v)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {governors.map((g: any, i: number) => (
            <Line
              key={g.governor_id}
              type="monotone"
              dataKey={g.governor_name}
              stroke={COLORS[i]}
              strokeWidth={2}
              dot={{ r: 2 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
