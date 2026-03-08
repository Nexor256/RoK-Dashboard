import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { parseCSV, normalizeHeaders, type ParsedRow } from "@/lib/csv";

const GENERAL_COLUMNS = [
  "governor_id", "governor_name", "alliance", "power",
  "t1_kills", "t2_kills", "t3_kills", "t4_kills", "t5_kills",
  "total_kills", "t45_kills", "killpoints",
  "deaths", "ranged",
  "resource_gathered", "rss_assistance",
  "helps", "city_hall_level",
];

export default function UploadPage() {
  const [snapshotDate, setSnapshotDate] = useState("");
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);
  const { toast } = useToast();

  const expectedColumns = GENERAL_COLUMNS;

  // Validate parsed data
  const warnings = useMemo(() => {
    if (!parsedData.length) return [];
    const w: string[] = [];

    const required = ["governor_name"];
    const sampleKeys = Object.keys(parsedData[0]);
    const missing = expectedColumns.filter((c) => !sampleKeys.includes(c));
    if (missing.length) w.push(`Missing columns: ${missing.join(", ")}`);

    // Check for required fields being empty
    const emptyNames = parsedData.filter((r) => !r.governor_name?.trim()).length;
    if (emptyNames) w.push(`${emptyNames} row(s) have empty governor name`);

    // Check for non-numeric values in numeric columns
    const numericCols = expectedColumns.filter((c) => !["governor_id", "governor_name", "alliance"].includes(c));
    let badValues = 0;
    for (const row of parsedData.slice(0, 50)) {
      for (const col of numericCols) {
        const val = row[col];
        if (val && val.trim() && isNaN(Number(val))) badValues++;
      }
    }
    if (badValues) w.push(`${badValues} non-numeric value(s) detected in numeric columns (checked first 50 rows)`);

    return w;
  }, [parsedData, expectedColumns]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setUploadResult(null);
      const file = e.target.files?.[0];
      if (!file) return;
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const rows = parseCSV(text);
        const normalized = normalizeHeaders(rows);
        setParsedData(normalized);
      };
      reader.readAsText(file);
    },
    [expectedColumns]
  );

  const handleUpload = async () => {
    if (!snapshotDate) {
      toast({ title: "Missing date", description: "Please select a snapshot date", variant: "destructive" });
      return;
    }
    if (parsedData.length === 0) {
      toast({ title: "No data", description: "Please upload a CSV file first", variant: "destructive" });
      return;
    }

    setUploading(true);
    setUploadResult(null);

    try {
      // Create snapshot
      const { data: snapshot, error: snapError } = await supabase
        .from("snapshots")
        .insert({
          snapshot_date: snapshotDate,
          snapshot_type: "general",
          label: snapshotLabel || null,
        })
        .select()
        .single();

      if (snapError) throw snapError;

      // Insert rows — if this fails, roll back the snapshot
      try {
        const rows = parsedData.map((row) => ({
          snapshot_id: snapshot.id,
          governor_id: row.governor_id || null,
          governor_name: row.governor_name || "",
          alliance: row.alliance || "",
          power: parseInt(row.power || "0", 10) || 0,
          t1_kills: parseInt(row.t1_kills || "0", 10) || 0,
          t2_kills: parseInt(row.t2_kills || "0", 10) || 0,
          t3_kills: parseInt(row.t3_kills || "0", 10) || 0,
          t4_kills: parseInt(row.t4_kills || "0", 10) || 0,
          t5_kills: parseInt(row.t5_kills || "0", 10) || 0,
          total_kills: parseInt(row.total_kills || "0", 10) || 0,
          t45_kills: parseInt(row.t45_kills || "0", 10) || 0,
          killpoints: parseInt(row.killpoints || "0", 10) || 0,
          deaths: parseInt(row.deaths || "0", 10) || 0,
          ranged: parseInt(row.ranged || "0", 10) || 0,
          resource_gathered: parseInt(row.resource_gathered || "0", 10) || 0,
          rss_assistance: parseInt(row.rss_assistance || "0", 10) || 0,
          helps: parseInt(row.helps || "0", 10) || 0,
          city_hall_level: parseInt(row.city_hall_level || "0", 10) || 0,
        }));
        const { error: insertError } = await supabase.from("governor_stats").insert(rows);
        if (insertError) throw insertError;
      } catch (insertErr) {
        // Rollback: delete the orphan snapshot
        await supabase.from("snapshots").delete().eq("id", snapshot.id);
        throw insertErr;
      }

      setUploadResult({
        success: true,
        message: `Successfully uploaded ${parsedData.length} governors`,
      });
      setParsedData([]);
      setFileName("");
      setSnapshotLabel("");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message: unknown }).message)
            : "Upload failed";
      setUploadResult({ success: false, message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl page-transition">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
          <span className="text-gradient">Upload Data</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Import governor data from CSV spreadsheets</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload form */}
        <Card className="border-white/[0.06] glass-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" /> CSV Upload
            </CardTitle>
            <CardDescription>
              Upload a CSV file with governor data. Headers should match the expected columns.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Snapshot Date</Label>
              <Input type="date" value={snapshotDate} onChange={(e) => setSnapshotDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Label (optional)</Label>
              <Input
                placeholder="e.g. KvK Season 3 - Week 1"
                value={snapshotLabel}
                onChange={(e) => setSnapshotLabel(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label>CSV File</Label>
              <div className="border-2 border-dashed border-white/[0.08] rounded-xl p-6 text-center hover:border-primary/40 transition-all duration-300 hover:bg-white/[0.02]">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer space-y-2 block">
                  <FileSpreadsheet className="h-8 w-8 mx-auto text-muted-foreground" />
                  {fileName ? (
                    <p className="text-sm font-medium">{fileName}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Click to select a CSV file</p>
                  )}
                </label>
              </div>
            </div>

            {parsedData.length > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {parsedData.length} rows parsed
                </p>
                <Button variant="ghost" size="sm" onClick={() => { setParsedData([]); setFileName(""); }}>
                  <Trash2 className="h-4 w-4 mr-1" /> Clear
                </Button>
              </div>
            )}

            {warnings.length > 0 && (
              <div className="rounded-md bg-yellow-500/10 border border-yellow-500/30 p-3 space-y-1">
                {warnings.map((w, i) => (
                  <p key={i} className="flex items-start gap-2 text-sm text-yellow-400">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                    {w}
                  </p>
                ))}
              </div>
            )}

            <Button onClick={handleUpload} disabled={uploading || parsedData.length === 0} className="w-full">
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {uploading ? "Uploading..." : "Upload to Database"}
            </Button>

            {uploadResult && (
              <div className={`flex items-center gap-2 p-3 rounded-md text-sm ${uploadResult.success ? "bg-green-500/10 text-green-400" : "bg-destructive/10 text-destructive"}`}>
                {uploadResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {uploadResult.message}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expected format */}
        <Card className="border-white/[0.06] glass-panel">
          <CardHeader>
            <CardTitle>Expected CSV Format</CardTitle>
            <CardDescription>
              Your CSV should have these column headers (order doesn't matter):
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {expectedColumns.map((col) => (
                <code key={col} className="block text-sm text-primary bg-primary/5 px-2 py-1 rounded">
                  {col}
                </code>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Common variations like "name", "t4kills", "passes" are auto-mapped.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Preview table */}
      {parsedData.length > 0 && (
        <Card className="border-white/[0.06] glass-panel">
          <CardHeader>
            <CardTitle>Data Preview</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {expectedColumns.map((col) => (
                      <TableHead key={col}>{col}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 10).map((row, i) => (
                    <TableRow key={i}>
                      {expectedColumns.map((col) => (
                        <TableCell key={col}>{row[col] ?? "—"}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {parsedData.length > 10 && (
                    <TableRow>
                      <TableCell colSpan={expectedColumns.length} className="text-center text-muted-foreground">
                        ... and {parsedData.length - 10} more rows
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
