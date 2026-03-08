import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  BarChart3,
  Trophy,
  Clock,
  Swords,
  Upload,
  Users,
  Search,
} from "lucide-react";
import { useLatestGovernorStats } from "@/hooks/useGovernorData";
import { fmt } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Rankings", path: "/rankings", icon: Trophy },
  { label: "Charts", path: "/charts", icon: BarChart3 },
  { label: "Snapshots", path: "/snapshots", icon: Clock },
  { label: "KvK Performance", path: "/kvk", icon: Swords },
  { label: "Upload Data", path: "/upload", icon: Upload },
  { label: "Manage Users", path: "/manage-users", icon: Users },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: governors = [] } = useLatestGovernorStats();
  const { isAdmin, isPrivileged } = useAuth();

  // ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const goTo = useCallback(
    (path: string) => {
      navigate(path);
      setOpen(false);
    },
    [navigate],
  );

  // Filter nav items based on user role
  const navItems = useMemo(
    () =>
      NAV_ITEMS.filter((item) => {
        if (item.path === "/manage-users") return isAdmin;
        if (item.path === "/upload") return isPrivileged;
        return true;
      }),
    [isAdmin, isPrivileged],
  );

  // All governors sorted by power for search
  const allGovs = useMemo(
    () =>
      (Array.isArray(governors) ? governors : [])
        .slice()
        .sort((a, b) => (b.power ?? 0) - (a.power ?? 0)),
    [governors],
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search by name or ID..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Pages">
          {navItems.map((item) => (
            <CommandItem
              key={item.path}
              onSelect={() => goTo(item.path)}
              className="gap-2.5 cursor-pointer"
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {allGovs.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Governors">
              {allGovs.map((g) => (
                <CommandItem
                  key={g.id}
                  value={`${g.governor_name} ${g.governor_id ?? ""} ${g.alliance ?? ""}`}
                  onSelect={() => goTo(`/rankings?search=${encodeURIComponent(g.governor_name)}`)}
                  className="gap-2.5 cursor-pointer"
                >
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm">{g.governor_name}</span>
                    {g.governor_id && (
                      <span className="text-xs text-muted-foreground/60 font-mono ml-1.5">#{g.governor_id}</span>
                    )}
                    {g.alliance && (
                      <span className="text-xs text-muted-foreground ml-1.5">[{g.alliance}]</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {fmt(g.power ?? 0)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
