import { useState, useCallback } from "react";
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
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type UploadType = "general" | "kvk";

interface ParsedRow {
  [key: string]: string;
}

const GENERAL_COLUMNS = [
  "governor_name", "alliance", "power", "t4_kills", "t5_kills",
  "deaths", "dead_troops", "healed", "resource_gathered", "power_growth",
];

const KVK_COLUMNS = [
  "governor_name", "alliance", "honor", "contribution", "passes_used",
  "rallies_joined", "garrisons_joined", "kvk_kills", "kvk_deaths",
];

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).filter(l => l.trim()).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    const row: ParsedRow = {};
    headers.forEach((h, i) => {
      row[h] = values[i] || "";
    });
    return row;
  });
}

function normalizeHeaders(rows: ParsedRow[], expectedCols: string[]): ParsedRow[] {
  // Try to map common header variations
  const headerMap: Record<string, string> = {
    name: "governor_name", governor: "governor_name", gov_name: "governor_name",
    t4kills: "t4_kills", t4: "t4_kills", t5kills: "t5_kills", t5: "t5_kills",
    dead: "dead_troops", dead_troop: "dead_troops",
    resource: "resource_gathered", resources: "resource_gathered",
    growth: "power_growth", passes: "passes_used", rallies: "rallies_joined",
    garrisons: "garrisons_joined", kvk_kill: "kvk_kills", kvk_death: "kvk_deaths",
  };

  return rows.map((row) => {
    const normalized: ParsedRow = {};
    for (const [key, value] of Object.entries(row)) {
      const mapped = headerMap[key] || key;
      normalized[mapped] = value;
    }
    return normalized;
  });
}

export default function UploadPage() {
  const [uploadType, setUploadType] = useState<UploadType>("general");
  const [snapshotDate, setSnapshotDate] = useState("");
  const [snapshotLabel, setSnapshotLabel] = useState("");
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);
  const { toast } = useToast();

  const expectedColumns = uploadType === "general" ? GENERAL_COLUMNS : KVK_COLUMNS;

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
        const normalized = normalizeHeaders(rows, expectedColumns);
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
          snapshot_type: uploadType,
          label: snapshotLabel || null,
        })
        .select()
        .single();

      if (snapError) throw snapError;

      // Insert rows
      if (uploadType === "general") {
        const rows = parsedData.map((row) => ({
          snapshot_id: snapshot.id,
          governor_name: row.governor_name || "",
          alliance: row.alliance || "",
          power: parseInt(row.power || "0", 10) || 0,
          t4_kills: parseInt(row.t4_kills || "0", 10) || 0,
          t5_kills: parseInt(row.t5_kills || "0", 10) || 0,
          deaths: parseInt(row.deaths || "0", 10) || 0,
          dead_troops: parseInt(row.dead_troops || "0", 10) || 0,
          healed: parseInt(row.healed || "0", 10) || 0,
          resource_gathered: parseInt(row.resource_gathered || "0", 10) || 0,
          power_growth: parseInt(row.power_growth || "0", 10) || 0,
        }));
        const { error: insertError } = await supabase.from("governor_stats").insert(rows);
        if (insertError) throw insertError;
      } else {
        const rows = parsedData.map((row) => ({
          snapshot_id: snapshot.id,
          governor_name: row.governor_name || "",
          alliance: row.alliance || "",
          honor: parseInt(row.honor || "0", 10) || 0,
          contribution: parseInt(row.contribution || "0", 10) || 0,
          passes_used: parseInt(row.passes_used || "0", 10) || 0,
          rallies_joined: parseInt(row.rallies_joined || "0", 10) || 0,
          garrisons_joined: parseInt(row.garrisons_joined || "0", 10) || 0,
          kvk_kills: parseInt(row.kvk_kills || "0", 10) || 0,
          kvk_deaths: parseInt(row.kvk_deaths || "0", 10) || 0,
        }));
        const { error: insertError } = await supabase.from("kvk_stats").insert(rows);
        if (insertError) throw insertError;
        
      }

      setUploadResult({
        success: true,
        message: `Successfully uploaded ${parsedData.length} governors to ${uploadType} snapshot`,
      });
      setParsedData([]);
      setFileName("");
      setSnapshotLabel("");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setUploadResult({ success: false, message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-display text-3xl font-bold text-primary">Upload Data</h1>
        <p className="text-muted-foreground mt-1">Import governor data from CSV spreadsheets</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload form */}
        <Card>
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
              <Label>Data Type</Label>
              <Select value={uploadType} onValueChange={(v) => { setUploadType(v as UploadType); setParsedData([]); setFileName(""); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Governor Stats</SelectItem>
                  <SelectItem value="kvk">KvK Performance</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
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
        <Card>
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
        <Card>
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
