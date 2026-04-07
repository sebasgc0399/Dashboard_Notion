export interface HabitDay {
  date: string;
  completed: string[];
  pct: number;
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
}
