import { useState, useCallback } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useOutletContext,
} from "react-router";
import { useNotionData } from "@/hooks/useNotionData";
import { tokenStore } from "@/services/tokenStore";
import { Layout } from "@/components/Layout";
import { Overview } from "@/pages/Overview";
import { Habits } from "@/pages/Habits";
import { Tasks } from "@/pages/Tasks";
import { Projects } from "@/pages/Projects";
import { Settings } from "@/pages/Settings";
import type { NotionData } from "@/types";

function DashboardShell() {
  const data = useNotionData();
  const isLoading =
    data.loading.habits || data.loading.tasks || data.loading.projects;

  if (!tokenStore.exists()) {
    return <Navigate to="/settings" replace />;
  }

  return (
    <Layout onRefresh={data.refresh} isLoading={isLoading}>
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
