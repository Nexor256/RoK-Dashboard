import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, TableProperties, BarChart3, History, Crown, Swords, Upload, LogOut, Shield, Moon, Sun, Menu, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/hooks/useTheme";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CompareProvider } from "@/hooks/useCompare";
import CompareDrawer, { CompareTray } from "@/components/CompareDrawer";
import CommandPalette from "@/components/CommandPalette";
import ChangePasswordDialog from "@/components/ChangePasswordDialog";

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
      {visibleItems.map((item) => {
        const isActive = pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onClick}
            className={cn(
              "group relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300",
              isActive
                ? "bg-primary text-primary-foreground shadow-md glow-primary-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
            )}
          >
            <item.icon className={cn("h-4 w-4 transition-transform duration-300", !isActive && "group-hover:scale-110")} />
            {item.label}
            {/* Bottom indicator */}
            <span
              className={cn(
                "absolute -bottom-[5px] left-1/2 -translate-x-1/2 h-[2px] rounded-full transition-all duration-300",
                isActive
                  ? "w-3/5 bg-primary-foreground opacity-80"
                  : "w-0 bg-primary group-hover:w-2/5 group-hover:opacity-60"
              )}
            />
          </Link>
        );
      })}
      {isAdmin && (
        <Link
          to="/manage-users"
          onClick={onClick}
          className={cn(
            "group relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300",
            pathname === "/manage-users"
              ? "bg-primary text-primary-foreground shadow-md glow-primary-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-white/[0.06]"
          )}
        >
          <Shield className={cn("h-4 w-4 transition-transform duration-300", pathname !== "/manage-users" && "group-hover:scale-110")} />
          Users
        </Link>
      )}
    </>
  );

  return (
    <CompareProvider>
    <div className="min-h-screen flex flex-col relative">
      {/* ── Header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 glass px-4 sm:px-6 py-3 flex items-center justify-between transition-shadow duration-300 hover:shadow-lg">
        {/* Logo */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-md glow-primary-sm transition-transform duration-300 hover:scale-105">
            <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground drop-shadow" />
          </div>
          <span className="font-display text-lg sm:text-xl font-bold tracking-tight text-foreground">
            ROK <span className="text-gradient">Dashboard</span>
          </span>
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks()}
          <div className="ml-3 pl-3 border-l border-white/[0.08] flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all duration-300"
              onClick={toggleTheme}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 transition-transform duration-500 hover:rotate-45" />
              ) : (
                <Moon className="h-4 w-4 transition-transform duration-500 hover:-rotate-12" />
              )}
            </Button>
            <div className="flex items-center gap-2 pl-1">
              <Avatar className="h-7 w-7 ring-2 ring-primary/30 transition-all duration-300 hover:ring-primary/60">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">{profile?.display_name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium text-muted-foreground hidden lg:inline">
                {profile?.display_name || "Admin"}
              </span>
            </div>
            <ChangePasswordDialog
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all duration-300"
                >
                  <KeyRound className="h-4 w-4" />
                </Button>
              }
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-300"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </nav>

        {/* Mobile nav */}
        <div className="flex md:hidden items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all duration-300"
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="hover:bg-white/[0.06]">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0 glass-panel">
              <div className="flex flex-col h-full">
                {/* Mobile header */}
                <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.08] bg-gradient-to-r from-primary/5 to-transparent">
                  <Avatar className="h-10 w-10 ring-2 ring-primary/30">
                    <AvatarImage src={profile?.avatar_url || ""} />
                    <AvatarFallback className="text-sm bg-primary/10 text-primary font-semibold">{profile?.display_name?.[0]?.toUpperCase() || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold truncate block">{profile?.display_name || "Admin"}</span>
                    <span className="text-xs text-muted-foreground">Member</span>
                  </div>
                </div>
                {/* Mobile links */}
                <nav className="flex flex-col gap-1 p-4 flex-1">
                  {navLinks(() => setMobileOpen(false))}
                </nav>
                <div className="p-4 border-t border-white/[0.08] space-y-1">
                  <ChangePasswordDialog
                    trigger={
                      <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-white/[0.06]">
                        <KeyRound className="h-4 w-4" /> Change Password
                      </Button>
                    }
                  />
                  <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-white/[0.06]">
                    <LogOut className="h-4 w-4" /> Sign out
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* ── Main Content ───────────────────────────────────── */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto w-full relative z-10">{children}</main>
      <footer className="border-t border-white/[0.06] px-4 sm:px-6 py-4 text-center">
        <span className="text-xs text-muted-foreground/60">ROK Dashboard · {new Date().getFullYear()}</span>
      </footer>
      <CompareDrawer />
      <CompareTray />
      <CommandPalette />
    </div>
    </CompareProvider>
  );
}
