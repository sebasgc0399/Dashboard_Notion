import { NavLink } from "react-router";
import { RefreshCw, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/Toaster";
import { cn } from "@/lib/utils";

interface LayoutProps {
  onRefresh: () => void;
  isLoading: boolean;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { to: "/", label: "General" },
  { to: "/habits", label: "Hábitos" },
  { to: "/tasks", label: "Tareas" },
  { to: "/projects", label: "Proyectos" },
];

export function Layout({ onRefresh, isLoading, children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-bg-base">
      <header className="sticky top-0 z-40 border-b border-border-subtle bg-bg-base/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          {/* App name */}
          <h1 className="shrink-0 text-sm font-semibold tracking-tight text-text-primary">
            Segundo Cerebro
          </h1>

          {/* Nav tabs — scrollable on mobile */}
          <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
            {NAV_ITEMS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  cn(
                    "shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-bg-elevated text-text-primary"
                      : "text-text-muted hover:text-text-secondary hover:bg-bg-hover"
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={isLoading}
              className="size-8 text-text-muted hover:text-text-primary"
              title="Recargar datos"
            >
              <RefreshCw
                className={cn("size-4", isLoading && "animate-spin")}
              />
            </Button>
            <NavLink to="/settings">
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-text-muted hover:text-text-primary"
                title="Settings"
              >
                <Settings className="size-4" />
              </Button>
            </NavLink>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>

      <Toaster />
    </div>
  );
}
