import { tokenStore } from "./tokenStore";
import { DB_IDS, HABITS_LIST } from "@/constants";
import type { HabitDay, Task, Project } from "@/types";

const PROXY_URL = import.meta.env.VITE_PROXY_URL;

export class NotionApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function queryNotion(databaseId: string, body: object): Promise<any> {
  const token = tokenStore.get();
  if (!token) throw new Error("No token");

  let res: Response;
  try {
    res = await fetch(`${PROXY_URL}?path=databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-notion-token": token,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new TypeError("No se pudo conectar. Revisá tu conexión a internet.");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new NotionApiError(res.status, err.message || `Error ${res.status}`);
  }

  return res.json();
}

export async function testConnection(): Promise<boolean> {
  const res = await queryNotion(DB_IDS.habits, { page_size: 1 });
  return res.results?.length >= 0;
}

export async function fetchHabits(): Promise<HabitDay[]> {
  const res = await queryNotion(DB_IDS.habits, {
    page_size: 30,
    sorts: [{ property: "Date", direction: "descending" }],
  });

  const totalHabits = HABITS_LIST.length;

  return res.results
    .map((result: any) => {
      const date = result.properties.Date?.date?.start;
      if (!date) return null;

      const completed = HABITS_LIST.filter(
        (h) => result.properties[h]?.checkbox === true
      );

      return {
        date,
        completed: completed as string[],
        pct: Math.round((completed.length / totalHabits) * 100),
      };
    })
    .filter((item: HabitDay | null): item is HabitDay => item !== null);
}

export async function fetchTasks(): Promise<Task[]> {
  const res = await queryNotion(DB_IDS.tasks, {
    page_size: 100,
    filter: {
      property: "Status",
      status: { does_not_equal: "Completed" },
    },
  });

  return res.results.map((result: any) => ({
    id: result.id,
    name: result.properties.Nombre?.title?.[0]?.plain_text ?? "Sin nombre",
    status: result.properties.Status?.status?.name ?? "Inbox",
    priority: result.properties.Prioridad?.select?.name ?? null,
    date: result.properties.Fecha?.date?.start ?? null,
    projectIds:
      result.properties.Proyecto?.relation?.map((r: any) => r.id) ?? [],
    description:
      result.properties["Descripción"]?.rich_text?.[0]?.plain_text ?? null,
  }));
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await queryNotion(DB_IDS.projects, {
    page_size: 100,
    filter: {
      property: "Archivo",
      checkbox: { equals: false },
    },
  });

  return res.results.map((result: any) => ({
    id: result.id,
    name: result.properties.Name?.title?.[0]?.plain_text ?? "Sin nombre",
    status: result.properties.Status?.status?.name ?? "Inbox",
    priority: result.properties.Prioridad?.select?.name ?? null,
    areaIds: result.properties.Area?.relation?.map((r: any) => r.id) ?? [],
  }));
}
