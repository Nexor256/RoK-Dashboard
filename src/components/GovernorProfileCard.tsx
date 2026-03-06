import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  useGovernorHistory,
  type GovernorStat,
  type GovernorHistoryPoint,
} from "@/hooks/useGovernorData";
import { fmt, computeRanks, type RankEntry } from "@/lib/utils";
import { Loader2, TrendingUp, Hash, History, Swords, Gauge } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { findTier, type PowerTier } from "@/hooks/useKvKThresholds";

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    color: "hsl(var(--foreground))",
    fontSize: 12,
  },
  labelStyle: { color: "hsl(var(--foreground))", fontWeight: 600 },
  itemStyle: { color: "hsl(var(--muted-foreground))" },
};

/* ─── KvK data passed from KvKPage ─────────────────────────── */

export interface WarGainsInfo {
  t4_gained: number;
  t5_gained: number;
  kills_gained: number;
  deaths_gained: number;
  dkp: number;
}

export interface KvKExtras {
  wars: { id: string; name: string; color: string; gains: WarGainsInfo | undefined }[];
  totalDkp: number;
  tiers: PowerTier[];
  power: number;
}

/* ─── Governor "stat" shape accepted: union of GovernorStat & snapshot comparison rows ── */

export interface GovernorProfileGov {
  governor_id: string | null;
  governor_name: string;
  alliance: string | null;
  power: number | null;
  killpoints: number | null;
  deaths: number | null;
  t4_kills?: number | null;
  t5_kills?: number | null;
  total_kills?: number | null;
  t45_kills?: number | null;
  resource_gathered?: number | null;
  rss_assistance?: number | null;
  helps?: number | null;
  city_hall_level?: number | null;
  ranged?: number | null;
}

/* ─── Props ──────────────────────────────────────────────────── */

interface GovernorProfileCardProps {
  governor: GovernorProfileGov | null;
  allGovernors?: GovernorStat[];
  kvkData?: KvKExtras;
  onClose: () => void;
}

/* ─── Component ──────────────────────────────────────────────── */

export default function GovernorProfileCard({
  governor,
  allGovernors,
  kvkData,
  onClose,
}: GovernorProfileCardProps) {
  const { data: history, isLoading: historyLoading } = useGovernorHistory(
    governor?.governor_id ?? null,
  );

  const ranks = useMemo(() => {
    if (!governor?.governor_id || !allGovernors?.length) return null;
    return computeRanks(allGovernors, governor.governor_id);
  }, [governor?.governor_id, allGovernors]);

  const allianceChanges = useMemo(() => {
    if (!history || history.length < 2) return [];
    const changes: { date: string; from: string; to: string }[] = [];
    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1].alliance ?? "—";
      const curr = history[i].alliance ?? "—";
      if (prev !== curr) {
        changes.push({
          date: history[i].snapshot_date,
          from: prev,
          to: curr,
        });
      }
    }
    return changes;
  }, [history]);

  return (
    <Dialog
      open={!!governor}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <DialogTitle className="text-xl">{governor?.governor_name}</DialogTitle>
            {governor?.governor_id && (
              <Badge variant="secondary" className="font-mono text-xs">
                ID: {governor.governor_id}
              </Badge>
            )}
            {governor?.alliance && (
              <Badge variant="outline" className="text-xs">
                [{governor.alliance}]
              </Badge>
            )}
          </div>
        </DialogHeader>

        {governor && (
          <Tabs defaultValue="overview" className="mt-1">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="overview" className="gap-1.5 text-xs">
                <Hash className="h-3.5 w-3.5" /> Overview
              </TabsTrigger>
              <TabsTrigger value="trends" className="gap-1.5 text-xs">
                <TrendingUp className="h-3.5 w-3.5" /> Trends
              </TabsTrigger>
              <TabsTrigger value="alliance" className="gap-1.5 text-xs">
                <History className="h-3.5 w-3.5" /> Alliance
              </TabsTrigger>
              {kvkData && (
                <TabsTrigger value="kvk" className="gap-1.5 text-xs">
                  <Swords className="h-3.5 w-3.5" /> KvK
                </TabsTrigger>
              )}
            </TabsList>

            {/* ── Overview Tab ── */}
            <TabsContent value="overview" className="mt-4">
              <OverviewTab governor={governor} ranks={ranks} />
            </TabsContent>

            {/* ── Trends Tab ── */}
            <TabsContent value="trends" className="mt-4">
              <TrendsTab
                history={history ?? []}
                isLoading={historyLoading}
                governorId={governor.governor_id}
              />
            </TabsContent>

            {/* ── Alliance History Tab ── */}
            <TabsContent value="alliance" className="mt-4">
              <AllianceTab
                changes={allianceChanges}
                currentAlliance={governor.alliance}
                isLoading={historyLoading}
                governorId={governor.governor_id}
              />
            </TabsContent>

            {/* ── KvK Tab (conditional) ── */}
            {kvkData && (
              <TabsContent value="kvk" className="mt-4">
                <KvKTab kvkData={kvkData} />
              </TabsContent>
            )}
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ═══ Sub-components ══════════════════════════════════════════ */

function RankBadge({ entry }: { entry: RankEntry | undefined }) {
  if (!entry) return null;
  return (
    <span className="text-[10px] text-muted-foreground font-medium ml-1">
      #{entry.rank}/{entry.total}
    </span>
  );
}

function StatCell({
  label,
  value,
  rank,
  highlight,
}: {
  label: string;
  value: string;
  rank?: RankEntry;
  highlight?: boolean;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-semibold text-sm ${highlight ? "text-primary" : "text-foreground"}`}>
        {value}
        <RankBadge entry={rank} />
      </p>
    </div>
  );
}

/* ── Overview ── */

function OverviewTab({
  governor,
  ranks,
}: {
  governor: GovernorProfileGov;
  ranks: Record<string, RankEntry> | null;
}) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <StatCell label="Power" value={fmt(governor.power ?? 0)} rank={ranks?.power} />
      <StatCell
        label="Kill Points"
        value={fmt(governor.killpoints ?? 0)}
        rank={ranks?.killpoints}
        highlight
      />
      <StatCell label="Deaths" value={fmt(governor.deaths ?? 0)} rank={ranks?.deaths} />
      <StatCell label="T4 Kills" value={fmt(governor.t4_kills ?? 0)} rank={ranks?.t4_kills} />
      <StatCell label="T5 Kills" value={fmt(governor.t5_kills ?? 0)} rank={ranks?.t5_kills} />
      <StatCell
        label="Total Kills"
        value={fmt(governor.total_kills ?? 0)}
        rank={ranks?.total_kills}
      />
      <StatCell
        label="RSS Gathered"
        value={fmt(governor.resource_gathered ?? 0)}
        rank={ranks?.resource_gathered}
      />
      <StatCell label="Helps" value={fmt(governor.helps ?? 0)} />
      <StatCell label="CH Level" value={String(governor.city_hall_level ?? "—")} />
      <StatCell label="Ranged" value={fmt(governor.ranged ?? 0)} />
    </div>
  );
}

/* ── Trends ── */

function TrendsTab({
  history,
  isLoading,
  governorId,
}: {
  history: GovernorHistoryPoint[];
  isLoading: boolean;
  governorId: string | null;
}) {
  if (!governorId) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No governor ID available — historical trends require a consistent ID across snapshots.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!history.length) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No historical data found for this governor.
      </p>
    );
  }

  const chartData = history.map((h) => ({
    date: h.snapshot_label || h.snapshot_date,
    Power: h.power ?? 0,
    T4: h.t4_kills ?? 0,
    T5: h.t5_kills ?? 0,
    "Total Kills": h.total_kills ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* Power over time */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Power Over Time
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => fmt(v)} />
            <Tooltip formatter={(v: number) => fmt(v)} {...TOOLTIP_STYLE} />
            <Line
              type="monotone"
              dataKey="Power"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Kill progression */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Kill Progression
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => fmt(v)} />
            <Tooltip formatter={(v: number) => fmt(v)} {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="T4" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
            <Line type="monotone" dataKey="T5" stroke="#ef4444" strokeWidth={2} dot={{ r: 2 }} />
            <Line
              type="monotone"
              dataKey="Total Kills"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── Alliance History ── */

function AllianceTab({
  changes,
  currentAlliance,
  isLoading,
  governorId,
}: {
  changes: { date: string; from: string; to: string }[];
  currentAlliance: string | null;
  isLoading: boolean;
  governorId: string | null;
}) {
  if (!governorId) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No governor ID available — alliance history requires a consistent ID across snapshots.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Current alliance: <span className="font-semibold text-foreground">[{currentAlliance ?? "—"}]</span>
      </p>
      {changes.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No alliance changes detected across snapshots.
        </p>
      ) : (
        <div className="rounded-lg border border-border/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-xs text-muted-foreground uppercase tracking-wider">
                <th className="text-left p-2 font-semibold">Date</th>
                <th className="text-left p-2 font-semibold">From</th>
                <th className="text-left p-2 font-semibold">To</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((c, i) => (
                <tr key={i} className="border-t border-border/40 hover:bg-muted/20">
                  <td className="p-2 text-muted-foreground">{c.date}</td>
                  <td className="p-2 font-medium">[{c.from}]</td>
                  <td className="p-2 font-medium text-primary">[{c.to}]</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── KvK Tab ── */

function KvKTab({ kvkData }: { kvkData: KvKExtras }) {
  const { wars, totalDkp, tiers, power } = kvkData;

  return (
    <div className="space-y-4">
      {/* Per-war breakdown */}
      {wars.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground">War Breakdown</p>
          {wars.map((w) => (
            <div key={w.id} className="flex justify-between items-center text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ backgroundColor: w.color }}
                />
                {w.name}
              </span>
              {w.gains ? (
                <span className="tabular-nums">
                  <span className="font-semibold" style={{ color: w.color }}>
                    {fmt(w.gains.dkp)}
                  </span>
                  <span className="text-muted-foreground text-xs ml-2">
                    T4: {fmt(w.gains.t4_gained)} · T5: {fmt(w.gains.t5_gained)} · K:{" "}
                    {fmt(w.gains.kills_gained)} · D: {fmt(w.gains.deaths_gained)}
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground/50">—</span>
              )}
            </div>
          ))}
          <div className="flex justify-between items-center text-sm font-bold border-t border-border pt-2">
            <span>Total DKP</span>
            <span className="text-primary tabular-nums">{fmt(totalDkp)}</span>
          </div>
        </div>
      )}

      {/* Threshold assessment */}
      {(() => {
        const tier = findTier(power, tiers);
        if (!tier) return null;
        const totalDeaths = wars.reduce(
          (s, w) => s + (w.gains?.deaths_gained ?? 0),
          0,
        );
        const dkpOk = totalDkp >= tier.min_dkp;
        const deathsOk = totalDeaths >= tier.min_deaths;
        return (
          <div className="border-t border-border pt-3 space-y-2">
            <p className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Gauge className="h-4 w-4" /> Power Tier Requirements
            </p>
            <p className="text-xs text-muted-foreground">
              Tier: Power ≥ {fmt(tier.min_power)}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div
                className={`rounded-lg p-2 ${dkpOk ? "bg-emerald-500/10" : "bg-destructive/10"}`}
              >
                <p className="text-xs text-muted-foreground">Min DKP</p>
                <p
                  className={`font-semibold ${dkpOk ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
                >
                  {fmt(totalDkp)} / {fmt(tier.min_dkp)}
                </p>
                <p className="text-xs mt-0.5">{dkpOk ? "✓ Passed" : "✗ Below minimum"}</p>
              </div>
              <div
                className={`rounded-lg p-2 ${deathsOk ? "bg-emerald-500/10" : "bg-destructive/10"}`}
              >
                <p className="text-xs text-muted-foreground">Min Deaths</p>
                <p
                  className={`font-semibold ${deathsOk ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
                >
                  {fmt(totalDeaths)} / {fmt(tier.min_deaths)}
                </p>
                <p className="text-xs mt-0.5">{deathsOk ? "✓ Passed" : "✗ Below minimum"}</p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
