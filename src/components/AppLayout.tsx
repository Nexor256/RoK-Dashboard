import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, TableProperties, BarChart3, History, Crown, Swords, Upload, LogOut, Shield, Moon, Sun, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/hooks/useTheme";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/rankings", label: "Rankings", icon: TableProperties },
  { to: "/charts", label: "Charts", icon: BarChart3 },
  { to: "/snapshots", label: "Snapshots", icon: History },
  { to: "/kvk", label: "KvK", icon: Swords },
  { to: "/upload", label: "Upload", icon: Upload, adminOnly: true },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { signOut, profile, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  const navLinks = (onClick?: () => void) => (
    <>
      {visibleItems.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onClick}
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
      {isAdmin && (
        <Link
          to="/manage-users"
          onClick={onClick}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
            pathname === "/manage-users"
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary"
          )}
        >
          <Shield className="h-4 w-4" />
          Users
        </Link>
      )}
    </>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-card px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <Crown className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
          <span className="font-display text-lg sm:text-2xl font-bold tracking-wide text-primary">
            ROK Dashboard
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks()}
          <div className="ml-2 pl-2 border-l border-border flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={toggleTheme} className="text-muted-foreground hover:text-foreground">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Avatar className="h-7 w-7">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="text-xs">{profile?.display_name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground hidden lg:inline">
              {profile?.display_name || "Admin"}
            </span>
            <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </nav>

        {/* Mobile nav */}
        <div className="flex md:hidden items-center gap-2">
          <Button variant="ghost" size="sm" onClick={toggleTheme} className="text-muted-foreground hover:text-foreground">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 p-0">
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback className="text-xs">{profile?.display_name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate">{profile?.display_name || "Admin"}</span>
                </div>
                <nav className="flex flex-col gap-1 p-3 flex-1">
                  {navLinks(() => setMobileOpen(false))}
                </nav>
                <div className="p-3 border-t border-border">
                  <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
                    <LogOut className="h-4 w-4" /> Sign out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
