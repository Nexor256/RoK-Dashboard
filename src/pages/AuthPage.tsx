import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crown, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  // Force dark mode on the login page
  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    root.classList.add("dark");
    return () => {
      if (!wasDark) root.classList.remove("dark");
    };
  }, []);
  const [governorId, setGovernorId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Support both raw governor ID and legacy email login
      const email = governorId.includes("@") ? governorId : `${governorId}@rok.local`;
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-violet-500/5 blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <Card className="w-full max-w-sm glass-panel border-gradient relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-lg glow-primary">
              <Crown className="h-5 w-5 text-primary-foreground drop-shadow" />
            </div>
          </div>
          <span className="font-display text-2xl font-bold text-gradient block mb-1">ROK Tracker</span>
          <CardTitle className="text-lg">Sign In</CardTitle>
          <CardDescription>Sign in with your Governor ID</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="governorId" className="text-sm font-medium">Governor ID</Label>
              <Input
                id="governorId"
                value={governorId}
                onChange={(e) => setGovernorId(e.target.value)}
                placeholder="e.g. 12345678"
                required
                className="bg-white/[0.04] border-white/[0.08] focus:border-primary/50 transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-white/[0.04] border-white/[0.08] focus:border-primary/50 transition-colors"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-violet-600 hover:from-primary/90 hover:to-violet-600/90 shadow-lg glow-primary-sm transition-all duration-300 hover:shadow-xl"
              disabled={loading}
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
