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
  type GovernorHistoryPoint,
} from "@/hooks/useGovernorData";
import { fmt, computeRanks, type RankEntry } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, TrendingUp, Hash, Swords, Gauge } from "lucide-react";
import { useKvKWars } from "@/hooks/useKvKWars";
import {
  useGovernorStatsMulti,
  type GovernorStat,
} from "@/hooks/useGovernorData";
import { useDkpWeights, DEFAULT_WEIGHTS, type DkpWeights } from "@/hooks/useDkpWeights";
import { useKvKThresholds } from "@/hooks/useKvKThresholds";
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

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/[0.08] bg-background/95 backdrop-blur-xl px-3.5 py-2.5 shadow-2xl">
      <p className="text-xs font-semibold text-foreground mb-1.5">{label}</p>
      <div className="space-y-1">
        {payload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-medium tabular-nums text-foreground">{fmt(entry.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
import { findTier, type PowerTier } from "@/hooks/useKvKThresholds";

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
  const { governorId } = useAuth();
  const { data: history, isLoading: historyLoading } = useGovernorHistory(
    governor?.governor_id ?? null,
  );

  const ranks = useMemo(() => {
    if (!governor?.governor_id || !allGovernors?.length) return null;
    return computeRanks(allGovernors, governor.governor_id);
  }, [governor?.governor_id, allGovernors]);

  /* ── Self-fetch KvK data when not provided via prop ── */
  const { data: wars = [] } = useKvKWars();
  const { data: weights = DEFAULT_WEIGHTS } = useDkpWeights();
  const { data: tiers = [] } = useKvKThresholds();

  const warSnapshotIds = useMemo(() => {
    const ids = new Set<string>();
    for (const w of wars) {
      if (w.snapshot_before_id) ids.add(w.snapshot_before_id);
      if (w.snapshot_after_id) ids.add(w.snapshot_after_id);
    }
    return [...ids];
  }, [wars]);

  const { data: allWarStats } = useGovernorStatsMulti(warSnapshotIds);

  const selfKvkData = useMemo<KvKExtras | undefined>(() => {
    if (!governor || !allWarStats?.length) return undefined;
    const govKey = governor.governor_id || governor.governor_name;

    const statsBySnap = new Map<string, GovernorStat[]>();
    for (const s of allWarStats) {
      let arr = statsBySnap.get(s.snapshot_id);
      if (!arr) { arr = []; statsBySnap.set(s.snapshot_id, arr); }
      arr.push(s);
    }

    const WAR_COLORS = [
      "hsl(221, 83%, 53%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)",
      "hsl(0, 84%, 60%)", "hsl(280, 68%, 60%)", "hsl(190, 90%, 50%)",
    ];

    let totalDkp = 0;
    const warResults: KvKExtras["wars"] = [];
    let colorIdx = 0;

    for (const w of wars) {
      if (!w.snapshot_before_id || !w.snapshot_after_id) { colorIdx++; continue; }
      const before = statsBySnap.get(w.snapshot_before_id) ?? [];
      const after = statsBySnap.get(w.snapshot_after_id) ?? [];
      if (!before.length || !after.length) { colorIdx++; continue; }

      const beforeMap = new Map<string, GovernorStat>();
      for (const g of before) {
        const k = g.governor_id || g.governor_name;
        beforeMap.set(k, g);
      }

      const gAfter = after.find(
        (g) => (g.governor_id || g.governor_name) === govKey,
      );
      if (!gAfter) {
        warResults.push({ id: w.id, name: w.name, color: WAR_COLORS[colorIdx % WAR_COLORS.length], gains: undefined });
        colorIdx++;
        continue;
      }

      const gBefore = beforeMap.get(govKey);
      const t4_gained = (gAfter.t4_kills ?? 0) - (gBefore?.t4_kills ?? 0);
      const t5_gained = (gAfter.t5_kills ?? 0) - (gBefore?.t5_kills ?? 0);
      const kills_gained = (gAfter.total_kills ?? 0) - (gBefore?.total_kills ?? 0);
      const deaths_gained = (gAfter.deaths ?? 0) - (gBefore?.deaths ?? 0);
      const dkp = t4_gained * weights.t4_kills + t5_gained * weights.t5_kills + deaths_gained * weights.deaths;
      totalDkp += dkp;

      warResults.push({
        id: w.id,
        name: w.name,
        color: WAR_COLORS[colorIdx % WAR_COLORS.length],
        gains: { t4_gained, t5_gained, kills_gained, deaths_gained, dkp },
      });
      colorIdx++;
    }

    if (!warResults.length) return undefined;
    return { wars: warResults, totalDkp, tiers, power: governor.power ?? 0 };
  }, [governor, allWarStats, wars, weights, tiers]);

  const resolvedKvk = kvkData ?? selfKvkData;

  return (
    <Dialog
      open={!!governor}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto border-white/[0.08] bg-background/95 backdrop-blur-xl shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-lg glow-primary-sm">
              <span className="text-primary-foreground font-bold text-sm">{governor?.governor_name?.[0]?.toUpperCase()}</span>
            </div>
            <div>
              <DialogTitle className="text-xl font-display font-extrabold">
                <span className="text-gradient">{governor?.governor_name}</span>
              </DialogTitle>
              <div className="flex items-center gap-1.5 mt-0.5">
                {!!governorId && governor?.governor_id === governorId && (
                  <Badge className="text-[10px] px-1.5 py-0 leading-4 bg-primary/20 text-primary border-primary/30">You</Badge>
                )}
                {governor?.governor_id && (
                  <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0 leading-4 bg-white/[0.04] border-white/[0.08]">
                    ID: {governor.governor_id}
                  </Badge>
                )}
                {governor?.alliance && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 leading-4 border-white/[0.08]">
                    [{governor.alliance}]
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {governor && (
          <Tabs defaultValue="overview" className="mt-2">
            <TabsList className="w-full justify-start bg-white/[0.03] border border-white/[0.06] rounded-lg">
              <TabsTrigger value="overview" className="gap-1.5 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md transition-all">
                <Hash className="h-3.5 w-3.5" /> Overview
              </TabsTrigger>
              <TabsTrigger value="trends" className="gap-1.5 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md transition-all">
                <TrendingUp className="h-3.5 w-3.5" /> Trends
              </TabsTrigger>
              <TabsTrigger value="kvk" className="gap-1.5 text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-md transition-all">
                <Swords className="h-3.5 w-3.5" /> KvK
              </TabsTrigger>
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

            {/* ── KvK History Tab ── */}
            <TabsContent value="kvk" className="mt-4">
              {resolvedKvk ? (
                <KvKTab kvkData={resolvedKvk} />
              ) : (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No KvK war data available yet.
                </p>
              )}
            </TabsContent>
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
    <span className="text-[10px] text-muted-foreground/70 font-medium ml-1 tabular-nums">
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
    <div className="rounded-lg bg-white/[0.03] border border-white/[0.06] p-2.5 space-y-1 hover:bg-white/[0.05] transition-colors duration-200">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className={`font-bold text-sm tabular-nums ${highlight ? "text-primary" : "text-foreground"}`}>
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
      <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Power Over Time
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(228 10% 18%)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => fmt(v)} />
            <Tooltip content={<ChartTooltip />} />
            <Line
              type="monotone"
              dataKey="Power"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "hsl(var(--primary))" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Kill progression */}
      <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Kill Progression
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(228 10% 18%)" />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => fmt(v)} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: "hsl(var(--foreground))" }} />
            <Line type="monotone" dataKey="T4" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 2, fill: "#f59e0b" }} />
            <Line type="monotone" dataKey="T5" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 2, fill: "#ef4444" }} />
            <Line
              type="monotone"
              dataKey="Total Kills"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 2, fill: "#10b981" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── KvK Tab ── */

function KvKChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/[0.08] bg-background/95 backdrop-blur-xl px-3.5 py-2.5 shadow-2xl">
      <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
            {entry.name}
          </span>
          <span className="font-medium tabular-nums text-foreground">{fmt(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

function KvKTab({ kvkData }: { kvkData: KvKExtras }) {
  const { wars, totalDkp, tiers, power } = kvkData;
  const warsWithGains = wars.filter((w) => w.gains);

  /* chart data */
  const chartData = warsWithGains.map((w) => ({
    name: w.name,
    DKP: w.gains!.dkp,
    Kills: w.gains!.kills_gained,
    Deaths: w.gains!.deaths_gained,
  }));

  return (
    <div className="space-y-4">
      {/* War summary table */}
      {warsWithGains.length > 0 ? (
        <div className="rounded-lg border border-white/[0.06] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.02] text-xs text-muted-foreground uppercase tracking-wider">
                <th className="text-left p-2.5 font-semibold">War</th>
                <th className="text-right p-2.5 font-semibold">DKP</th>
                <th className="text-right p-2.5 font-semibold">Kills</th>
                <th className="text-right p-2.5 font-semibold">Deaths</th>
              </tr>
            </thead>
            <tbody>
              {warsWithGains.map((w) => (
                <tr key={w.id} className="border-t border-white/[0.06] hover:bg-white/[0.03] transition-colors duration-200">
                  <td className="p-2.5">
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: w.color }} />
                      <span className="font-medium">{w.name}</span>
                    </span>
                  </td>
                  <td className="p-2.5 text-right font-bold tabular-nums" style={{ color: w.color }}>
                    {fmt(w.gains!.dkp)}
                  </td>
                  <td className="p-2.5 text-right tabular-nums text-muted-foreground">{fmt(w.gains!.kills_gained)}</td>
                  <td className="p-2.5 text-right tabular-nums text-muted-foreground">{fmt(w.gains!.deaths_gained)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-white/[0.08] bg-white/[0.03]">
                <td className="p-2.5 font-bold">Total</td>
                <td className="p-2.5 text-right font-bold text-primary tabular-nums">{fmt(totalDkp)}</td>
                <td className="p-2.5 text-right font-semibold tabular-nums text-muted-foreground">
                  {fmt(warsWithGains.reduce((s, w) => s + (w.gains?.kills_gained ?? 0), 0))}
                </td>
                <td className="p-2.5 text-right font-semibold tabular-nums text-muted-foreground">
                  {fmt(warsWithGains.reduce((s, w) => s + (w.gains?.deaths_gained ?? 0), 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-4 text-center">
          This governor has no recorded war participation.
        </p>
      )}

      {/* Mini bar chart */}
      {chartData.length > 0 && (
        <div className="rounded-lg bg-white/[0.02] border border-white/[0.06] p-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Performance per War
          </p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(228 10% 18%)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v: number) => fmt(v)} />
              <Tooltip content={<KvKChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: "hsl(var(--foreground))" }} />
              <Bar dataKey="DKP" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Kills" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Deaths" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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
        const totalKp = wars.reduce(
          (s, w) => s + (w.gains?.kills_gained ?? 0),
          0,
        );
        const kpOk = totalKp >= tier.min_kp;
        const deathsOk = totalDeaths >= tier.min_deaths;
        return (
          <div className="border-t border-white/[0.06] pt-4 space-y-3">
            <p className="text-sm font-bold text-foreground flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Gauge className="h-3.5 w-3.5 text-amber-400" />
              </div>
              Power Tier Requirements
            </p>
            <p className="text-xs text-muted-foreground">
              Tier: {fmt(tier.min_power)} – {tier.max_power ? fmt(tier.max_power) : "∞"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div
                className={`rounded-xl p-3 border ${kpOk ? "bg-emerald-500/10 border-emerald-500/20" : "bg-destructive/10 border-destructive/20"}`}
              >
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Min KP</p>
                <p
                  className={`font-bold tabular-nums ${kpOk ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
                >
                  {fmt(totalKp)} / {fmt(tier.min_kp)}
                </p>
                <p className={`text-xs mt-0.5 font-medium ${kpOk ? "text-emerald-500" : "text-destructive"}`}>{kpOk ? "✓ Passed" : "✗ Below minimum"}</p>
              </div>
              <div
                className={`rounded-xl p-3 border ${deathsOk ? "bg-emerald-500/10 border-emerald-500/20" : "bg-destructive/10 border-destructive/20"}`}
              >
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Min Deaths</p>
                <p
                  className={`font-bold tabular-nums ${deathsOk ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
                >
                  {fmt(totalDeaths)} / {fmt(tier.min_deaths)}
                </p>
                <p className={`text-xs mt-0.5 font-medium ${deathsOk ? "text-emerald-500" : "text-destructive"}`}>{deathsOk ? "✓ Passed" : "✗ Below minimum"}</p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
