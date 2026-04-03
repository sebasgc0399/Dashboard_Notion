export const HABITS_LIST = [
  "Ejercicio",
  "Codear",
  "Leer",
  "Meditar",
  "Comer bien",
  "Tomar agua",
  "Planificar el día",
  "Madrugar",
  "Gratitud",
  "Practicar inglés",
  "Tiempo con pareja",
  "Estirar",
  "Tender la cama",
  "No comer dulce",
] as const;

export const DB_IDS = {
  habits: "240485e0-fe4f-83e4-86c3-018061a48f2e",
  tasks: "eed485e0-fe4f-83e8-a2a0-811192be957a",
  projects: "a70485e0-fe4f-83da-90ca-0199c37a69aa",
} as const;

/** Hex colors for Recharts — NOT Tailwind tokens */
export const CHART_COLORS = {
  emerald: "#10b981",
  emeraldLight: "#34d399",
  blue: "#3b82f6",
  violet: "#8b5cf6",
  amber: "#f59e0b",
  rose: "#f43f5e",
  cyan: "#06b6d4",
  pink: "#ec4899",
  lime: "#84cc16",
  orange: "#f97316",
  teal: "#14b8a6",
  indigo: "#6366f1",
  fuchsia: "#d946ef",
  sky: "#0ea5e9",
} as const;

export const STATUS_COLORS: Record<string, string> = {
  // Task statuses
  "En proceso": "#3b82f6",
  "Inbox": "#71717a",
  "Esperando": "#f59e0b",
  "Sin fecha": "#a1a1aa",
  "Delegada": "#8b5cf6",
  "Completed": "#10b981",
  // Project statuses
  "Not Started": "#a1a1aa",
  "In Progress": "#3b82f6",
  "On Hold": "#f59e0b",
} as const;

export const PRIORITY_COLORS: Record<string, string> = {
  // Task priorities
  "Urgente": "#ef4444",
  "Alta": "#f97316",
  "Media": "#f59e0b",
  "Baja": "#71717a",
  // Project priorities
  "Urgent": "#ef4444",
  "High": "#f97316",
  "Medium": "#f59e0b",
  "Low": "#71717a",
} as const;

/** Abbreviations for habit names (chart axes) */
export const HABIT_ABBREVIATIONS: Record<string, string> = {
  "Ejercicio": "Ejerc.",
  "Codear": "Codear",
  "Leer": "Leer",
  "Meditar": "Medit.",
  "Comer bien": "Comer",
  "Tomar agua": "Agua",
  "Planificar el día": "Planif.",
  "Madrugar": "Madrug.",
  "Gratitud": "Grat.",
  "Practicar inglés": "Inglés",
  "Tiempo con pareja": "Pareja",
  "Estirar": "Estir.",
  "Tender la cama": "Cama",
  "No comer dulce": "NoDulce",
} as const;
