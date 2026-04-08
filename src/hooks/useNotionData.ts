import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  fetchHabits,
  fetchTasks,
  fetchProjects,
  fetchTasksSchema,
  fetchProjectsSchema,
  updateHabitCheckbox,
  updateTaskFields,
  updateProjectFields,
  MissingDbIdError,
  NotionApiError,
  NotionPermissionError,
  SchemaPropNotFoundError,
} from "@/services/notion";
import { toastStore } from "@/services/toastStore";
import { habitAbbreviation } from "@/lib/habitLabel";
import type {
  HabitDay,
  Task,
  Project,
  LoadingState,
  ErrorState,
  HabitTrend,
  HabitFreq,
  NotionData,
  DbKey,
  DbSchema,
  TaskUpdate,
  ProjectUpdate,
} from "@/types";

// ────────────────────────────────────────────────────────────────────────────
// Module-level helpers (mutation infra)
// ────────────────────────────────────────────────────────────────────────────

const MUTATION_TIMEOUT_MS = 12_000;

class MutationTimeoutError extends Error {
  constructor() {
    super("Mutation timed out");
    this.name = "MutationTimeoutError";
  }
}

function timeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new MutationTimeoutError()), ms);
  });
}

interface ErrorContext {
  entity: "habit" | "task" | "project";
  field?: string;
}

function handleMutationError(error: unknown, ctx: ErrorContext): void {
  if (error instanceof MutationTimeoutError) {
    toastStore.show({
      variant: "error",
      message: "La actualización está tardando demasiado.",
      description: "Verificá tu conexión y reintentá.",
    });
    return;
  }
  if (error instanceof NotionPermissionError) {
    toastStore.show({
      variant: "error",
      message: "Tu integración no tiene permisos de escritura.",
      description:
        "En notion.so/my-integrations → tu integración → Capabilities → marcá 'Update content'.",
    });
    return;
  }
  if (error instanceof SchemaPropNotFoundError) {
    const entityLabel =
      ctx.entity === "task"
        ? "Tareas"
        : ctx.entity === "project"
          ? "Proyectos"
          : "Hábitos";
    toastStore.show({
      variant: "error",
      message: `No se encontró la propiedad "${error.expectedType}" en ${entityLabel}.`,
      description: "Revisá la configuración del database en Notion.",
    });
    return;
  }
  if (error instanceof NotionApiError) {
    if (error.status === 401) {
      toastStore.show({
        variant: "error",
        message: "Token expirado.",
        description: "Reconectá en Settings.",
      });
      return;
    }
    if (error.status === 429) {
      toastStore.show({
        variant: "error",
        message: "Notion está limitando requests.",
        description: "Esperá unos segundos y reintentá.",
      });
      return;
    }
    if (error.status === 400) {
      toastStore.show({
        variant: "error",
        message: "Valor inválido.",
        description: "Tu workspace puede haber cambiado. Recargá la página.",
      });
      return;
    }
    if (error.status >= 500) {
      toastStore.show({
        variant: "error",
        message: "Notion no está respondiendo.",
        description: "Intentá de nuevo en un minuto.",
      });
      return;
    }
  }
  if (error instanceof TypeError) {
    toastStore.show({
      variant: "error",
      message: "No se pudo conectar con Notion.",
    });
    return;
  }
  toastStore.show({
    variant: "error",
    message: "Error desconocido al guardar.",
  });
}

interface Slot {
  applyValue: (value: any) => void;
  lastConfirmedValue: any;
  desiredValue: any;
  sendPatch: (value: any) => Promise<void>;
  inFlight: boolean;
  errorContext: ErrorContext;
}

// ────────────────────────────────────────────────────────────────────────────
// Read-error message helper (for loaders, not mutations)
// ────────────────────────────────────────────────────────────────────────────

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
  const [habitNames, setHabitNames] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [loading, setLoading] = useState<LoadingState>({
    habits: true,
    tasks: true,
    projects: true,
  });
  const [errors, setErrors] = useState<ErrorState>({});
  const [dbIdsMissing, setDbIdsMissing] = useState<DbKey[]>([]);

  // Phase 3 state
  const [tasksSchema, setTasksSchema] = useState<DbSchema | null>(null);
  const [projectsSchema, setProjectsSchema] = useState<DbSchema | null>(null);
  const [pendingMutations, setPendingMutations] = useState<Set<string>>(
    () => new Set()
  );
  const slotsRef = useRef<Map<string, Slot>>(new Map());

  // ──────────────────────────────────────────────────────────────────────────
  // Loaders
  // ──────────────────────────────────────────────────────────────────────────

  const handleLoadError = useCallback((key: DbKey, error: unknown) => {
    if (error instanceof MissingDbIdError) {
      setDbIdsMissing((prev) =>
        prev.includes(key) ? prev : [...prev, key]
      );
      setErrors((prev) => ({ ...prev, [key]: undefined }));
      return;
    }
    setErrors((prev) => ({ ...prev, [key]: getErrorMessage(error) }));
  }, []);

  const loadHabits = useCallback(async () => {
    setLoading((prev) => ({ ...prev, habits: true }));
    setErrors((prev) => ({ ...prev, habits: undefined }));
    setDbIdsMissing((prev) => prev.filter((k) => k !== "habits"));
    try {
      const { habits, habitNames } = await fetchHabits();
      setHabits(habits);
      setHabitNames(habitNames);
    } catch (error) {
      handleLoadError("habits", error);
    } finally {
      setLoading((prev) => ({ ...prev, habits: false }));
    }
  }, [handleLoadError]);

  const loadTasks = useCallback(async () => {
    setLoading((prev) => ({ ...prev, tasks: true }));
    setErrors((prev) => ({ ...prev, tasks: undefined }));
    setDbIdsMissing((prev) => prev.filter((k) => k !== "tasks"));
    try {
      const data = await fetchTasks();
      setTasks(data);
    } catch (error) {
      handleLoadError("tasks", error);
    } finally {
      setLoading((prev) => ({ ...prev, tasks: false }));
    }
  }, [handleLoadError]);

  const loadProjects = useCallback(async () => {
    setLoading((prev) => ({ ...prev, projects: true }));
    setErrors((prev) => ({ ...prev, projects: undefined }));
    setDbIdsMissing((prev) => prev.filter((k) => k !== "projects"));
    try {
      const data = await fetchProjects();
      setProjects(data);
    } catch (error) {
      handleLoadError("projects", error);
    } finally {
      setLoading((prev) => ({ ...prev, projects: false }));
    }
  }, [handleLoadError]);

  const loadSchemas = useCallback(async () => {
    const [tasksRes, projectsRes] = await Promise.allSettled([
      fetchTasksSchema(),
      fetchProjectsSchema(),
    ]);

    if (tasksRes.status === "fulfilled") {
      setTasksSchema(tasksRes.value);
    } else if (!(tasksRes.reason instanceof MissingDbIdError)) {
      console.warn("Failed to load tasks schema:", tasksRes.reason);
    }
    if (projectsRes.status === "fulfilled") {
      setProjectsSchema(projectsRes.value);
    } else if (!(projectsRes.reason instanceof MissingDbIdError)) {
      console.warn("Failed to load projects schema:", projectsRes.reason);
    }
  }, []);

  const refresh = useCallback(() => {
    if (pendingMutations.size > 0) {
      toastStore.show({
        variant: "info",
        message: "Esperá a que terminen las ediciones en curso.",
      });
      return;
    }
    loadHabits();
    loadTasks();
    loadProjects();
  }, [pendingMutations, loadHabits, loadTasks, loadProjects]);

  useEffect(() => {
    loadHabits();
    loadTasks();
    loadProjects();
    // Initial mount only — refresh has its own deps that would re-trigger
    // unwanted re-fetches; we want exactly one load on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadSchemas();
  }, [loadSchemas]);

  // ──────────────────────────────────────────────────────────────────────────
  // Mutation infra
  // ──────────────────────────────────────────────────────────────────────────

  const processSlot = useCallback(async (key: string): Promise<void> => {
    const slot = slotsRef.current.get(key);
    if (!slot) return;
    if (slot.inFlight) return;

    if (slot.desiredValue === slot.lastConfirmedValue) {
      slotsRef.current.delete(key);
      setPendingMutations((prev) => {
        if (!prev.has(key)) return prev;
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      return;
    }

    const target = slot.desiredValue;
    slot.inFlight = true;

    try {
      await Promise.race([
        slot.sendPatch(target),
        timeoutPromise(MUTATION_TIMEOUT_MS),
      ]);
      slot.lastConfirmedValue = target;
      slot.inFlight = false;
      // Process again in case more updates came in while in flight.
      await processSlot(key);
    } catch (error) {
      slot.applyValue(slot.lastConfirmedValue);
      slotsRef.current.delete(key);
      setPendingMutations((prev) => {
        if (!prev.has(key)) return prev;
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      handleMutationError(error, slot.errorContext);
    }
  }, []);

  const requestMutation = useCallback(
    (params: {
      key: string;
      newValue: any;
      initialValue: any;
      applyValue: (value: any) => void;
      sendPatch: (value: any) => Promise<void>;
      errorContext: ErrorContext;
    }) => {
      const { key, newValue, initialValue, applyValue, sendPatch, errorContext } =
        params;

      // Skip no-op updates if no slot is in flight for this key.
      if (newValue === initialValue && !slotsRef.current.has(key)) {
        return;
      }

      applyValue(newValue);

      const existing = slotsRef.current.get(key);
      if (!existing) {
        slotsRef.current.set(key, {
          applyValue,
          lastConfirmedValue: initialValue,
          desiredValue: newValue,
          sendPatch,
          inFlight: false,
          errorContext,
        });
        setPendingMutations((prev) => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
      } else {
        existing.desiredValue = newValue;
        existing.applyValue = applyValue;
        existing.sendPatch = sendPatch;
      }

      processSlot(key);
    },
    [processSlot]
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Mutation entry points
  // ──────────────────────────────────────────────────────────────────────────

  const updateHabit = useCallback(
    (dayPageId: string, habit: string, value: boolean) => {
      if (!habits) return;
      const day = habits.find((d) => d.id === dayPageId);
      if (!day) return;

      const currentValue = day.completed.includes(habit);
      const key = `${dayPageId}:${habit}`;

      requestMutation({
        key,
        newValue: value,
        initialValue: currentValue,
        applyValue: (next: boolean) => {
          setHabits((prev) =>
            prev?.map((d) => {
              if (d.id !== dayPageId) return d;
              const completed = next
                ? Array.from(new Set([...d.completed, habit]))
                : d.completed.filter((h) => h !== habit);
              return {
                ...d,
                completed,
                pct:
                  habitNames.length === 0
                    ? 0
                    : Math.round((completed.length / habitNames.length) * 100),
              };
            }) ?? null
          );
        },
        sendPatch: (next: boolean) =>
          updateHabitCheckbox(dayPageId, habit, next),
        errorContext: { entity: "habit", field: habit },
      });
    },
    [habits, habitNames, requestMutation]
  );

  const updateTask = useCallback(
    (taskId: string, fields: TaskUpdate) => {
      if (!tasks) return;
      if (!tasksSchema) {
        toastStore.show({
          variant: "error",
          message: "No se pudo cargar el schema de Tareas.",
          description: "Recargá la página.",
        });
        return;
      }
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      for (const [field, newValue] of Object.entries(fields) as Array<
        [keyof TaskUpdate, any]
      >) {
        if (newValue === undefined) continue;
        const initialValue = task[field as keyof Task];
        const key = `${taskId}:${field}`;

        requestMutation({
          key,
          newValue,
          initialValue,
          applyValue: (next: any) => {
            setTasks((prev) =>
              prev?.map((t) =>
                t.id === taskId ? { ...t, [field]: next } : t
              ) ?? null
            );
          },
          sendPatch: (next: any) =>
            updateTaskFields(
              taskId,
              { [field]: next } as TaskUpdate,
              tasksSchema
            ),
          errorContext: { entity: "task", field },
        });
      }
    },
    [tasks, tasksSchema, requestMutation]
  );

  const updateProject = useCallback(
    (projectId: string, fields: ProjectUpdate) => {
      if (!projects) return;
      if (!projectsSchema) {
        toastStore.show({
          variant: "error",
          message: "No se pudo cargar el schema de Proyectos.",
          description: "Recargá la página.",
        });
        return;
      }
      const project = projects.find((p) => p.id === projectId);
      if (!project) return;

      for (const [field, newValue] of Object.entries(fields) as Array<
        [keyof ProjectUpdate, any]
      >) {
        if (newValue === undefined) continue;
        const initialValue = project[field as keyof Project];
        const key = `${projectId}:${field}`;

        requestMutation({
          key,
          newValue,
          initialValue,
          applyValue: (next: any) => {
            setProjects((prev) =>
              prev?.map((p) =>
                p.id === projectId ? { ...p, [field]: next } : p
              ) ?? null
            );
          },
          sendPatch: (next: any) =>
            updateProjectFields(
              projectId,
              { [field]: next } as ProjectUpdate,
              projectsSchema
            ),
          errorContext: { entity: "project", field },
        });
      }
    },
    [projects, projectsSchema, requestMutation]
  );

  // ──────────────────────────────────────────────────────────────────────────
  // Derived data
  // ──────────────────────────────────────────────────────────────────────────

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
    if (!habits || habits.length === 0 || habitNames.length === 0) return [];
    const totalDays = habits.length;
    return habitNames.map((habit) => {
      const count = habits.filter((day) =>
        day.completed.includes(habit)
      ).length;
      return {
        name: habitAbbreviation(habit),
        full: habit,
        pct: Math.round((count / totalDays) * 100),
      };
    });
  }, [habits, habitNames]);

  return {
    habits,
    habitNames,
    tasks,
    projects,
    loading,
    errors,
    dbIdsMissing,
    habitTrend,
    avgPct,
    todayData,
    tasksByStatus,
    projectsByStatus,
    habitFreq,
    refresh,
    // Phase 3
    tasksSchema,
    projectsSchema,
    pendingMutations,
    updateHabit,
    updateTask,
    updateProject,
  };
}
