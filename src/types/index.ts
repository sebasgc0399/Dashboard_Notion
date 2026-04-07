export interface HabitDay {
  id: string;
  date: string;
  completed: string[];
  pct: number;
}

export interface SchemaOption {
  name: string;
  color: string;
}

export interface DbSchema {
  statusPropName: string;
  status: SchemaOption[];
  priorityPropName: string;
  priority: SchemaOption[];
  datePropName?: string;
}

export interface TaskUpdate {
  status?: string;
  priority?: string | null;
  date?: string | null;
}

export interface ProjectUpdate {
  status?: string;
  priority?: string | null;
}

export interface Task {
  id: string;
  name: string;
  status: string;
  priority: string | null;
  date: string | null;
  projectIds: string[];
  description: string | null;
}

export interface Project {
  id: string;
  name: string;
  status: string;
  priority: string | null;
  areaIds: string[];
}

export interface LoadingState {
  habits: boolean;
  tasks: boolean;
  projects: boolean;
}

export interface ErrorState {
  habits?: string;
  tasks?: string;
  projects?: string;
}

export interface HabitTrend {
  date: string;
  pct: number;
  count: number;
}

export interface HabitFreq {
  name: string;
  full: string;
  pct: number;
}

export type DbKey = "habits" | "tasks" | "projects";

export interface NotionData {
  habits: HabitDay[] | null;
  tasks: Task[] | null;
  projects: Project[] | null;
  loading: LoadingState;
  errors: ErrorState;
  dbIdsMissing: DbKey[];
  habitTrend: HabitTrend[];
  avgPct: number;
  todayData: { pct: number; count: number } | null;
  tasksByStatus: Record<string, number>;
  projectsByStatus: Record<string, number>;
  habitFreq: HabitFreq[];
  refresh: () => void;
  // Phase 3
  tasksSchema: DbSchema | null;
  projectsSchema: DbSchema | null;
  pendingMutations: Set<string>;
  updateHabit: (dayPageId: string, habit: string, value: boolean) => void;
  updateTask: (taskId: string, fields: TaskUpdate) => void;
  updateProject: (projectId: string, fields: ProjectUpdate) => void;
}
