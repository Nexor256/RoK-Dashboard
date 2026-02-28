import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, TableProperties, BarChart3, History, Crown, Swords, Upload, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/rankings", label: "Rankings", icon: TableProperties },
  { to: "/charts", label: "Charts", icon: BarChart3 },
  { to: "/snapshots", label: "Snapshots", icon: History },
  { to: "/kvk", label: "KvK", icon: Swords },
  { to: "/upload", label: "Upload", icon: Upload },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-card px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Crown className="h-7 w-7 text-primary" />
          <span className="font-display text-2xl font-bold tracking-wide text-primary">
            ROK Governor Tracker
          </span>
        </div>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                pathname === item.to
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
          <div className="ml-2 pl-2 border-l border-border flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden lg:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </nav>
      </header>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
