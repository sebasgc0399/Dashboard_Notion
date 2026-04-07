const STORAGE_KEY = "notion_db_ids";

export type DbKey = "habits" | "tasks" | "projects";
export type DbIds = Record<DbKey, string>;

function read(): Partial<DbIds> | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as Partial<DbIds>;
    return null;
  } catch {
    return null;
  }
}

function write(ids: Partial<DbIds>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export const dbIdsStore = {
  get(): Partial<DbIds> | null {
    return read();
  },
  set(ids: DbIds): void {
    write(ids);
  },
  setPartial(ids: Partial<DbIds>): void {
    const current = read() ?? {};
    write({ ...current, ...ids });
  },
  clear(): void {
    localStorage.removeItem(STORAGE_KEY);
  },
  isComplete(): boolean {
    const ids = read();
    return !!(ids && ids.habits && ids.tasks && ids.projects);
  },
};
