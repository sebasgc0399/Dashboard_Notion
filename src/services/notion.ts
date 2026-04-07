import { tokenStore } from "./tokenStore";
import { dbIdsStore, type DbIds, type DbKey } from "./dbIdsStore";
import { HABITS_LIST } from "@/constants";
import type { HabitDay, Task, Project } from "@/types";

const PROXY_URL = import.meta.env.VITE_PROXY_URL;

export class NotionApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export class MissingDbIdError extends Error {
  missing: DbKey[];
  constructor(missing: DbKey[]) {
    super(`DB_ID_MISSING:${missing.join(",")}`);
    this.missing = missing;
  }
}

async function callProxy(path: string, body: object): Promise<any> {
  const token = tokenStore.get();
  if (!token) throw new Error("No token");

  let res: Response;
  try {
    res = await fetch(`${PROXY_URL}?path=${path}`, {
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

function queryNotion(databaseId: string, body: object): Promise<any> {
  return callProxy(`databases/${databaseId}/query`, body);
}

function requireDbId(key: DbKey): string {
  const ids = dbIdsStore.get();
  const id = ids?.[key];
  if (!id) throw new MissingDbIdError([key]);
  return id;
}

// ────────────────────────────────────────────────────────────────────────────
// Database ID resolver
// ────────────────────────────────────────────────────────────────────────────

const DB_KEYS: DbKey[] = ["habits", "tasks", "projects"];

const NAME_HEURISTICS: Record<DbKey, string[]> = {
  habits: ["habit", "habito"],
  tasks: ["task", "tarea"],
  projects: ["project", "proyecto"],
};

const REQUIRED_PROPS: Record<DbKey, Array<{ name: string; type: string }>> = {
  // habits is special-cased below (checks for HABITS_LIST checkboxes)
  habits: [{ name: "Date", type: "date" }],
  tasks: [
    { name: "Nombre", type: "title" },
    { name: "Status", type: "status" },
    { name: "Prioridad", type: "select" },
    { name: "Fecha", type: "date" },
    { name: "Proyecto", type: "relation" },
  ],
  projects: [
    { name: "Name", type: "title" },
    { name: "Status", type: "status" },
    { name: "Prioridad", type: "select" },
    { name: "Archivo", type: "checkbox" },
    { name: "Area", type: "relation" },
  ],
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getDatabaseTitle(db: any): string {
  const titleArr = db?.title;
  if (!Array.isArray(titleArr)) return "";
  return titleArr.map((t: any) => t?.plain_text ?? "").join("");
}

function schemaMatches(db: any, key: DbKey): boolean {
  const props = db?.properties;
  if (!props || typeof props !== "object") return false;

  if (key === "habits") {
    if (props.Date?.type !== "date") return false;
    const habitCheckboxes = HABITS_LIST.filter(
      (habit) => props[habit]?.type === "checkbox"
    );
    return habitCheckboxes.length >= 3;
  }

  return REQUIRED_PROPS[key].every(({ name, type }) => {
    const p = props[name];
    return p && p.type === type;
  });
}

function scoreDatabase(db: any, key: DbKey): number {
  const titleNorm = normalize(getDatabaseTitle(db));
  if (!titleNorm) return 0;

  const heuristics = NAME_HEURISTICS[key];
  const nameMatches = heuristics.some((h) => titleNorm.includes(h));
  if (!nameMatches) return 0; // name match is required

  let score = 10;
  if (heuristics.some((h) => titleNorm === h)) score += 2;
  if (schemaMatches(db, key)) score += 5;
  return score;
}

export interface ResolveResult {
  resolved: Partial<DbIds>;
  ambiguous: DbKey[];
  missing: DbKey[];
}

function pickWinners(databases: any[]): ResolveResult {
  const resolved: Partial<DbIds> = {};
  const ambiguous: DbKey[] = [];
  const missing: DbKey[] = [];

  for (const key of DB_KEYS) {
    const scored = databases
      .map((db) => ({ db, score: scoreDatabase(db, key) }))
      .filter((x) => x.score >= 10)
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      missing.push(key);
      continue;
    }
    if (scored.length > 1 && scored[0].score === scored[1].score) {
      ambiguous.push(key);
      continue;
    }
    resolved[key] = scored[0].db.id;
  }

  return { resolved, ambiguous, missing };
}

export async function resolveDatabaseIds(): Promise<ResolveResult> {
  const collected: any[] = [];
  let cursor: string | undefined = undefined;
  const MAX_PAGES = 5;

  for (let page = 0; page < MAX_PAGES; page++) {
    const body: Record<string, any> = {
      filter: { value: "database", property: "object" },
      page_size: 100,
    };
    if (cursor) body.start_cursor = cursor;

    const res = await callProxy("search", body);
    if (Array.isArray(res?.results)) collected.push(...res.results);

    // Early exit: if we already have a clean resolution for all 3, stop.
    const partial = pickWinners(collected);
    if (
      partial.missing.length === 0 &&
      partial.ambiguous.length === 0 &&
      Object.keys(partial.resolved).length === DB_KEYS.length
    ) {
      return partial;
    }

    if (!res?.has_more || !res?.next_cursor) break;
    cursor = res.next_cursor;
  }

  return pickWinners(collected);
}

// ────────────────────────────────────────────────────────────────────────────
// Connection test
// ────────────────────────────────────────────────────────────────────────────

export async function testConnection(): Promise<boolean> {
  // A successful search call proves the token is valid; the resolver
  // tells us whether the integration can see the expected databases.
  await callProxy("search", {
    filter: { value: "database", property: "object" },
    page_size: 1,
  });
  return true;
}

// ────────────────────────────────────────────────────────────────────────────
// Data fetchers
// ────────────────────────────────────────────────────────────────────────────

export async function fetchHabits(): Promise<HabitDay[]> {
  const dbId = requireDbId("habits");
  const res = await queryNotion(dbId, {
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
  const dbId = requireDbId("tasks");
  const res = await queryNotion(dbId, {
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
  const dbId = requireDbId("projects");
  const res = await queryNotion(dbId, {
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
