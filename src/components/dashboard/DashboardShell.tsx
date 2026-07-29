import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Bot,
  KeyRound,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardRailId = "overview" | "agents" | "secrets" | "chat";

const RAIL: Array<{ id: DashboardRailId; label: string; icon: LucideIcon; to?: string }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "secrets", label: "Secrets", icon: KeyRound },
  { id: "chat", label: "Chat", icon: MessageSquare, to: "/chat" },
];

export function DashboardShell({
  active = "overview",
  onSelect,
  children,
}: {
  active?: DashboardRailId;
  onSelect?: (id: DashboardRailId) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1">
      <aside className="hidden w-52 shrink-0 flex-col border-r border-border-subtle bg-surface-1/40 md:flex">
        <nav className="flex flex-col gap-0.5 p-2" aria-label="Dashboard">
          {RAIL.map(({ id, label, icon: Icon, to }) => {
            const selected = active === id;
            const className = cn(
              "flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
              selected
                ? "bg-surface-3 text-foreground"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
            );
            if (to) {
              return (
                <Link key={id} to={to} className={className}>
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            }
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelect?.(id)}
                className={className}
                aria-current={selected ? "page" : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            );
          })}
        </nav>
      </aside>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-8 sm:py-8">{children}</div>
      </div>
    </div>
  );
}
