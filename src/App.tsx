import { useState, useCallback } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  NavLink,
  Outlet,
  useOutletContext,
} from "react-router";
import { AlertTriangle } from "lucide-react";
import { useNotionData } from "@/hooks/useNotionData";
import { tokenStore } from "@/services/tokenStore";
import { Layout } from "@/components/Layout";
import { Overview } from "@/pages/Overview";
import { Habits } from "@/pages/Habits";
import { Tasks } from "@/pages/Tasks";
import { Projects } from "@/pages/Projects";
import { Settings } from "@/pages/Settings";
import type { DbKey, NotionData } from "@/types";

const DB_LABELS: Record<DbKey, string> = {
  habits: "Hábitos",
  tasks: "Tareas",
  projects: "Proyectos",
};

function DbIdsMissingBanner({ missing }: { missing: DbKey[] }) {
  if (missing.length === 0) return null;
  const names = missing.map((k) => DB_LABELS[k]).join(", ");
  return (
    <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1">
        <p className="font-medium">Faltan databases por configurar: {names}.</p>
        <p className="mt-0.5 text-xs text-amber-200/80">
          La integración no encontró estos databases automáticamente.{" "}
          <NavLink to="/settings" className="underline hover:text-amber-100">
            Ir a Configuración
          </NavLink>{" "}
          para resolverlos manualmente.
        </p>
      </div>
    </div>
  );
}

function DashboardShell() {
  const data = useNotionData();
  const isLoading =
    data.loading.habits || data.loading.tasks || data.loading.projects;

  if (!tokenStore.exists()) {
    return <Navigate to="/settings" replace />;
  }

  return (
    <Layout onRefresh={data.refresh} isLoading={isLoading}>
      <DbIdsMissingBanner missing={data.dbIdsMissing} />
      <Outlet context={data} />
    </Layout>
  );
}

export default function App() {
  const [tokenVersion, setTokenVersion] = useState(0);

  const handleTokenChange = useCallback(() => {
    setTokenVersion((v) => v + 1);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/settings"
          element={<Settings onTokenChange={handleTokenChange} />}
        />
        <Route element={<DashboardShell key={tokenVersion} />}>
          <Route index element={<OverviewPage />} />
          <Route path="habits" element={<HabitsPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="projects" element={<ProjectsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

// Page wrappers that consume outlet context

function OverviewPage() {
  const data = useOutletContext<NotionData>();
  return (
    <Overview
      habits={data.habits}
      tasks={data.tasks}
      projects={data.projects}
      loading={data.loading}
      errors={data.errors}
      habitTrend={data.habitTrend}
      avgPct={data.avgPct}
      todayData={data.todayData}
      tasksByStatus={data.tasksByStatus}
      refresh={data.refresh}
    />
  );
}

function HabitsPage() {
  const data = useOutletContext<NotionData>();
  return (
    <Habits
      habits={data.habits}
      habitFreq={data.habitFreq}
      loading={data.loading.habits}
      error={data.errors.habits}
      onRetry={data.refresh}
    />
  );
}

function TasksPage() {
  const data = useOutletContext<NotionData>();
  return (
    <Tasks
      tasks={data.tasks}
      loading={data.loading.tasks}
      error={data.errors.tasks}
      onRetry={data.refresh}
    />
  );
}

function ProjectsPage() {
  const data = useOutletContext<NotionData>();
  return (
    <Projects
      projects={data.projects}
      projectsByStatus={data.projectsByStatus}
      loading={data.loading.projects}
      error={data.errors.projects}
      onRetry={data.refresh}
    />
  );
}
