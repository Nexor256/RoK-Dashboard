import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, TableProperties, BarChart3, History, Crown, Swords, Upload, LogOut, Shield, Moon, Sun, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/hooks/useTheme";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CompareProvider } from "@/hooks/useCompare";
import CompareDrawer, { CompareTray } from "@/components/CompareDrawer";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/rankings", label: "Rankings", icon: TableProperties },
  { to: "/charts", label: "Charts", icon: BarChart3 },
  { to: "/snapshots", label: "Snapshots", icon: History },
  { to: "/kvk", label: "KvK", icon: Swords },
  { to: "/upload", label: "Upload", icon: Upload, privilegedOnly: true },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { signOut, profile, isAdmin, isPrivileged } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleItems = navItems.filter((item) => !item.privilegedOnly || isPrivileged);

  const navLinks = (onClick?: () => void) => (
    <>
      {visibleItems.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onClick}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
            pathname === item.to
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
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
            "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
            pathname === "/manage-users"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <Shield className="h-4 w-4" />
          Users
        </Link>
      )}
    </>
  );

  return (
    <CompareProvider>
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border/60 glass px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary flex items-center justify-center shadow-sm">
            <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg sm:text-xl font-bold tracking-tight text-foreground">
            ROK Dashboard
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks()}
          <div className="ml-3 pl-3 border-l border-border/60 flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground" onClick={toggleTheme}>
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <div className="flex items-center gap-2 pl-1">
              <Avatar className="h-7 w-7 ring-2 ring-primary/20">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">{profile?.display_name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium text-muted-foreground hidden lg:inline">
                {profile?.display_name || "Admin"}
              </span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </nav>

        {/* Mobile nav */}
        <div className="flex md:hidden items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-3 px-5 py-5 border-b border-border bg-muted/30">
                  <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback className="text-sm bg-primary/10 text-primary font-semibold">{profile?.display_name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold truncate block">{profile?.display_name || "Admin"}</span>
                    <span className="text-xs text-muted-foreground">Member</span>
                  </div>
                </div>
                <nav className="flex flex-col gap-1 p-4 flex-1">
                  {navLinks(() => setMobileOpen(false))}
                </nav>
                <div className="p-4 border-t border-border">
                  <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground">
                    <LogOut className="h-4 w-4" /> Sign out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto w-full">{children}</main>
      <CompareDrawer />
      <CompareTray />
    </div>
    </CompareProvider>
  );
}
