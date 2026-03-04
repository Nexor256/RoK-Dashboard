import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Loader2, Users, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

export default function ManageUsersPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();
  const { session } = useAuth();
  const queryClient = useQueryClient();

  const { data: profiles = [], isLoading: loading } = useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      return (data as Profile[]) || [];
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !displayName) return;
    setCreating(true);

    try {
      let avatarUrl: string | null = null;

      // Upload avatar if provided
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(path, avatarFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }

      // Call edge function
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: { email, password, display_name: displayName, avatar_url: avatarUrl },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "User created", description: `${displayName} can now sign in with ${email}` });
      setEmail("");
      setPassword("");
      setDisplayName("");
      setAvatarFile(null);
      setAvatarPreview(null);
      queryClient.invalidateQueries({ queryKey: ["profiles"] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create user";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="font-display text-3xl font-bold text-primary flex items-center gap-2">
          <Shield className="h-7 w-7" /> Manage Users
        </h1>
        <p className="text-muted-foreground mt-1">Create and manage player accounts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create user form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" /> Create Player Account
            </CardTitle>
            <CardDescription>Players will sign in with the credentials you set here.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={avatarPreview || ""} />
                  <AvatarFallback className="text-lg">{displayName?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                </Avatar>
                <div className="space-y-1 flex-1">
                  <Label>Profile Photo</Label>
                  <Input type="file" accept="image/*" onChange={handleAvatarChange} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Display Name (in-game name)</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Governor name" required />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="player@example.com" required />
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" required minLength={6} />
              </div>

              <Button type="submit" className="w-full" disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                Create Account
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Player list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Players ({profiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : profiles.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No players yet</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={p.avatar_url || ""} />
                            <AvatarFallback>{p.display_name[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{p.display_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(p.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
