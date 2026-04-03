import { useState, useCallback, useEffect, useMemo } from "react";
import { fetchHabits, fetchTasks, fetchProjects } from "@/services/notion";
import { HABITS_LIST, HABIT_ABBREVIATIONS } from "@/constants";
import type {
  HabitDay,
  Task,
  Project,
  LoadingState,
  ErrorState,
  HabitTrend,
  HabitFreq,
  NotionData,
} from "@/types";

function getErrorMessage(error: unknown): string {
  if (error instanceof TypeError) {
    return "No se pudo conectar. Revisá tu conexión a internet.";
  }
  if (error instanceof Error && "status" in error) {
    const status = (error as any).status as number;
    if (status === 401)
      return "Token inválido o expirado. Verificá en Settings.";
    if (status === 429)
      return "Notion tiene límite de requests. Esperá unos segundos y recargá.";
    if (status >= 500)
      return "Error del servidor. Intentá de nuevo en unos minutos.";
  }
  if (error instanceof Error) return error.message;
  return "Error desconocido";
}

export function useNotionData(): NotionData {
  const [habits, setHabits] = useState<HabitDay[] | null>(null);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [loading, setLoading] = useState<LoadingState>({
    habits: true,
    tasks: true,
    projects: true,
  });
  const [errors, setErrors] = useState<ErrorState>({});

  const loadHabits = useCallback(async () => {
    setLoading((prev) => ({ ...prev, habits: true }));
    setErrors((prev) => ({ ...prev, habits: undefined }));
    try {
      const data = await fetchHabits();
      setHabits(data);
    } catch (error) {
      setErrors((prev) => ({ ...prev, habits: getErrorMessage(error) }));
    } finally {
      setLoading((prev) => ({ ...prev, habits: false }));
    }
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading((prev) => ({ ...prev, tasks: true }));
    setErrors((prev) => ({ ...prev, tasks: undefined }));
    try {
      const data = await fetchTasks();
      setTasks(data);
    } catch (error) {
      setErrors((prev) => ({ ...prev, tasks: getErrorMessage(error) }));
    } finally {
      setLoading((prev) => ({ ...prev, tasks: false }));
    }
  }, []);

  const loadProjects = useCallback(async () => {
    setLoading((prev) => ({ ...prev, projects: true }));
    setErrors((prev) => ({ ...prev, projects: undefined }));
    try {
      const data = await fetchProjects();
      setProjects(data);
    } catch (error) {
      setErrors((prev) => ({ ...prev, projects: getErrorMessage(error) }));
    } finally {
      setLoading((prev) => ({ ...prev, projects: false }));
    }
  }, []);

  const refresh = useCallback(() => {
    loadHabits();
    loadTasks();
    loadProjects();
  }, [loadHabits, loadTasks, loadProjects]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Derived data

  const habitTrend = useMemo<HabitTrend[]>(() => {
    if (!habits) return [];
    return [...habits]
      .reverse()
      .map((day) => ({
        date: day.date,
        pct: day.pct,
        count: day.completed.length,
      }));
  }, [habits]);

  const avgPct = useMemo(() => {
    if (!habits || habits.length === 0) return 0;
    const sum = habits.reduce((acc, day) => acc + day.pct, 0);
    return Math.round(sum / habits.length);
  }, [habits]);

  const todayData = useMemo<{ pct: number; count: number } | null>(() => {
    if (!habits || habits.length === 0) return null;
    const today = habits[0];
    return { pct: today.pct, count: today.completed.length };
  }, [habits]);

  const tasksByStatus = useMemo<Record<string, number>>(() => {
    if (!tasks) return {};
    return tasks.reduce(
      (acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [tasks]);

  const projectsByStatus = useMemo<Record<string, number>>(() => {
    if (!projects) return {};
    return projects.reduce(
      (acc, project) => {
        acc[project.status] = (acc[project.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [projects]);

  const habitFreq = useMemo<HabitFreq[]>(() => {
    if (!habits || habits.length === 0) return [];
    const totalDays = habits.length;
    return HABITS_LIST.map((habit) => {
      const count = habits.filter((day) =>
        day.completed.includes(habit)
      ).length;
      return {
        name: HABIT_ABBREVIATIONS[habit] || habit,
        full: habit,
        pct: Math.round((count / totalDays) * 100),
      };
    });
  }, [habits]);

  return {
    habits,
    tasks,
    projects,
    loading,
    errors,
    habitTrend,
    avgPct,
    todayData,
    tasksByStatus,
    projectsByStatus,
    habitFreq,
    refresh,
  };
}
