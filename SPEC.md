# Segundo Cerebro Dashboard

> Dashboard web de productividad que **visualiza y edita** datos de un workspace de Notion en tiempo real, con descubrimiento dinámico de hábitos y resolución automática de databases.

## Visión General

App web personal estilo Vercel/Linear (dark, minimal, premium) que se conecta a un sistema de productividad en Notion llamado "Segundo Cerebro" y muestra métricas de hábitos, tareas y proyectos en gráficos interactivos. Cualquier persona con la misma plantilla de Notion puede usar el dashboard ingresando su Integration Token desde el frontend.

Además de visualización, la app permite editar inline los campos más frecuentes (status, prioridad, fechas, checkboxes de hábitos) sin abrir Notion. Las ediciones usan optimistic updates con rollback automático en caso de error.

## Objetivos

- Visualizar productividad diaria/semanal de un vistazo
- Identificar patrones: qué hábitos se mantienen, cuáles se abandonan
- Ver y editar el estado real de tareas y proyectos sin abrir Notion
- Que sea reutilizable: cualquier usuario con la plantilla "Segundo Cerebro" puede conectarse, sin tocar código

## Alcance funcional

### Incluido

- **Settings**: pantalla para ingresar/probar/borrar el Notion Integration Token, más un panel de override manual de Database IDs si la auto-resolución falla.
- **Vista General**: 4 KPIs + gráfico tendencia hábitos + pie chart tareas + lista compacta proyectos en progreso.
- **Vista Hábitos**: heatmap (hábitos × días) + bar chart consistencia por hábito. **Click en una celda** togglea el checkbox del día.
- **Vista Tareas**: lista completa con badges editables — status, prioridad y fecha se editan inline.
- **Vista Proyectos**: distribución por status + lista completa. Status y prioridad editables inline.
- **Edición inline con optimistic updates + rollback**: cambios visibles al instante, sincronización en background, rollback automático si Notion rechaza la mutación. Ver [SPEC_INTERACTIVE_EDITS.md](SPEC_INTERACTIVE_EDITS.md).
- **Hábitos descubiertos dinámicamente** del schema del database (sin lista hardcoded). Ver [SPEC_DYNAMIC_HABITS.md](SPEC_DYNAMIC_HABITS.md).
- **Auto-resolución de los 3 databases** del workspace por nombre + schema, con override manual desde Settings.
- **Sistema de toasts local** (`services/toastStore.ts` + `components/Toaster.tsx`) para feedback de mutaciones.
- **Refresh manual**: botón que recarga los 3 datasets siempre (no solo la vista activa). Queda deshabilitado si hay mutaciones optimistas en vuelo.
- **Responsive**: desktop (≥1024px), tablet (≥768px) y mobile (<768px) con breakpoints definidos.

### Excluido (futuras versiones)

- Crear nuevos items (días de hábitos, tareas, proyectos) desde el dashboard — solo se editan los existentes.
- Editar nombres, descripciones o relaciones (Proyecto, Area).
- Drag & drop, bulk edit, sincronización en tiempo real con cambios externos hechos en Notion.
- Autenticación OAuth de Notion (por ahora es token manual).
- Notificaciones o alertas.
- PWA / offline mode.
- Histórico más allá de 30 días de hábitos.
- Resolver relaciones (Proyecto→nombre, Area→nombre) — requeriría N+1 queries adicionales.
- Paginación automática para datasets > 100 items.

## Arquitectura

```
┌─────────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   Frontend (SPA)    │────▶│  Firebase Cloud Fn    │────▶│   Notion API    │
│   React + Vite      │     │  (Proxy CORS)         │     │   v2022-06-28   │
│   Firebase Hosting  │     │  /notionProxy         │     │                 │
└─────────────────────┘     └──────────────────────┘     └─────────────────┘
```

**¿Por qué un proxy?** La API de Notion bloquea CORS desde browsers. La Cloud Function recibe el request del frontend, lo reenvía a Notion con el token, y devuelve la respuesta.

### Stack

| Capa | Tecnología |
|------|-----------|
| Framework | React 19 + TypeScript strict |
| Build | Vite |
| Estilos | Tailwind CSS v4 (sin config file, usa `@import "tailwindcss"`) |
| Componentes | shadcn/ui (los que se necesiten) |
| Gráficos | Recharts (LineChart, PieChart, BarChart) |
| Routing | React Router v7 (paquete: `react-router`, imports desde `"react-router"` — no usa `react-router-dom`) |
| Iconos | Lucide React |
| Hosting | Firebase Hosting |
| Proxy | Firebase Cloud Functions v2 (onRequest) |
| Deploy CLI | firebase-tools |

### Decisiones técnicas

- **Tailwind CSS v4 + shadcn/ui** en vez de MUI: control total del diseño, bundle más liviano.
- **Recharts** recibe colores como hex strings, NO tokens de Tailwind. Existe un objeto `CHART_COLORS` separado en `constants.ts`.
- **Token en frontend** (localStorage vía `tokenStore`): permite que cualquier usuario con la plantilla lo use sin backend propio. El token viaja como header `x-notion-token` al proxy.
- **Auto-resolución de DB IDs**: en lugar de hardcodear los 3 IDs en `constants.ts`, la app llama a `POST search` y matchea por heurística de nombre + schema (`services/notion.ts → resolveDatabaseIds`). Permite que cualquier usuario con la plantilla 'Segundo Cerebro' la use sin tocar código. Los IDs resueltos se persisten en `services/dbIdsStore.ts` (localStorage).
- **Schemas dinámicos para selects editables**: el resolver de propiedades de Tareas/Proyectos busca por *tipo* (`status`, `select`, `date`) y no por nombre literal — soporta workspaces que renombran las propiedades. Ver `fetchTasksSchema` y `fetchProjectsSchema` en `services/notion.ts`.

## Diseño

**Dirección general:** Dashboard dark premium, estilo Vercel/Linear. Limpio, con buen contraste entre capas (fondo → cards → hover). Que se vea profesional, no genérico.

**Referencia de apps a imitar:** Vercel Dashboard, Linear App, Raycast.

**Fuentes (Google Fonts):** Outfit + JetBrains Mono.

**Tema:** Dark. El diseño de colores, contrastes, sombras, bordes, espaciado, animaciones y hover states queda a criterio del desarrollador. Lo único importante es que las cards se distingan del fondo, los hover sean perceptibles, y los textos secundarios sean legibles.

**Gráficos:** Recharts recibe colores como hex strings, NO tokens de Tailwind ni CSS variables. El objeto `CHART_COLORS` en `constants.ts` define los hex necesarios. Los tooltips de Recharts usan un componente custom `ChartTooltip.tsx` que respeta el design system (fondo oscuro, bordes sutiles, tipografía consistente con el resto de la app).

## Estructura del Proyecto

```
src/
  components/
    ui/                         # shadcn (los que se usen)
    Layout.tsx                  # Header + navegación + acciones (refresh, settings)
    StatCard.tsx                # KPI card
    StatusChip.tsx              # Badge coloreado por status/prioridad
    SectionSkeleton.tsx         # Skeleton/placeholder por sección mientras carga
    EmptyState.tsx              # Icono + mensaje para secciones sin datos
    ErrorInline.tsx             # Error inline por sección con botón "Reintentar"
    ChartTooltip.tsx            # Tooltip custom reutilizable para Recharts
    Charts.tsx                  # TrendLineChart, TaskPieChart, ProjectBarChart
    HabitHeatmap.tsx            # Grid hábitos × días, descubierto dinámicamente
    HabitConsistencyChart.tsx   # BarChart horizontal
    TaskList.tsx                # Lista de tareas — dual render: tabla en desktop, cards en mobile. Edición inline.
    ProjectList.tsx             # Lista de proyectos — dual render. Edición inline.
    SelectPopover.tsx           # Popover reutilizable para selects inline (status, prioridad)
    Toaster.tsx                 # Renderiza toasts del toastStore con auto-dismiss
  pages/
    Overview.tsx
    Habits.tsx
    Tasks.tsx
    Projects.tsx
    Settings.tsx                # Token + panel de Databases (auto-resolución + override manual)
  hooks/
    useNotionData.ts            # Fetch + state + datos derivados + mutaciones optimistas
  services/
    notion.ts                   # API + resolveDatabaseIds + fetchers + schemas + mutations
    tokenStore.ts               # Abstracción get/set/clear sobre localStorage para el token
    dbIdsStore.ts               # Auto-resolución + override manual de los 3 DB IDs (persistido en localStorage)
    toastStore.ts               # Mini pub/sub + queue para toasts globales
  types/
    index.ts                    # HabitDay, HabitsData, Task, Project, DbSchema, TaskUpdate, ProjectUpdate, NotionData, etc.
  lib/
    utils.ts                    # cn() helper (clsx + tailwind-merge)
    habitLabel.ts               # habitAbbreviation() — truncate inteligente para labels del chart de consistencia
  constants.ts                  # CHART_COLORS, STATUS_COLORS, PRIORITY_COLORS, NOTION_COLOR_MAP, getNotionColor
  globals.css                   # Tailwind v4 imports + theme tokens + animaciones
  App.tsx
  main.tsx
functions/
  src/
    index.ts                    # Cloud Function proxy (GET/POST/PATCH on databases/, pages/, search)
  package.json
  tsconfig.json
firebase.json
.firebaserc
.env                            # VITE_PROXY_URL para dev
.env.production                 # VITE_PROXY_URL para prod
components.json                 # Config shadcn
```

## Schemas esperados de los databases

> **Los Database IDs no se hardcodean.** Se auto-resuelven en runtime via `resolveDatabaseIds` en `services/notion.ts`, llamando a `POST search` y matcheando por heurística de nombre + schema. Si la auto-resolución falla o queda ambigua, Settings permite override manual y persiste el ID en `dbIdsStore`.

### 1. Habit Tracker

**Reglas de descubrimiento:** la app considera **cualquier propiedad de tipo `checkbox`** del database como un hábito. Las descubre dinámicamente vía `extractHabitNames()` en `services/notion.ts`. Existe una blacklist mínima (`HABITS_PROP_BLACKLIST`) para excluir checkboxes utilitarios como `Archive`. Ver [SPEC_DYNAMIC_HABITS.md](SPEC_DYNAMIC_HABITS.md) para el detalle.

**Propiedades del template de referencia** (no son un contrato — la app soporta cualquier cantidad y nombre de checkboxes):

| Propiedad | Tipo | Nota |
|-----------|------|------|
| Name | title | Siempre "Daily Habits" |
| Date | date | `.date?.start` → "2026-04-01". **Required.** |
| Ejercicio | checkbox | Hábito |
| Codear | checkbox | Hábito |
| Leer | checkbox | Hábito |
| Meditar | checkbox | Hábito |
| Comer bien | checkbox | Hábito |
| Tomar agua | checkbox | Hábito |
| Planificar el día | checkbox | Hábito |
| Madrugar | checkbox | Hábito |
| Gratitud | checkbox | Hábito |
| Practicar inglés | checkbox | Hábito |
| Tiempo con pareja | checkbox | Hábito |
| Estirar | checkbox | Hábito |
| Tender la cama | checkbox | Hábito |
| No comer dulce | checkbox | Hábito |
| Progress | formula | % calculado por Notion (no usado por la app) |

> El template de referencia tiene 14 checkboxes, pero la app soporta cualquier cantidad. Agregar, quitar, renombrar o reordenar checkboxes en Notion se refleja al refrescar.

**Query:**
```json
{
  "page_size": 30,
  "sorts": [{ "property": "Date", "direction": "descending" }]
}
```

**Parseo:** `fetchHabits()` hace primero un `GET databases/{id}` para extraer los nombres de los checkboxes (`habitNames`), después el query, y por cada página devuelve `{ id, date, completed: string[], pct }` donde `completed` es la lista de hábitos marcados ese día y `pct = completed.length / habitNames.length * 100`.

### 2. Tareas

| Propiedad | Tipo | Valores |
|-----------|------|---------|
| Nombre | title | `.title[0]?.plain_text` |
| Status | status | En proceso, Inbox, Esperando, Sin fecha, Delegada, Completed |
| Prioridad | select | Baja, Media, Alta, Urgente |
| Fecha | date | `.date?.start` |
| Proyecto | relation | `[{ id: "xxx" }]` — solo IDs, no resolver nombres en v1 |
| Descripción | text | `.rich_text[0]?.plain_text` |

> Los nombres de **propiedades editables** (`Status`, `Prioridad`, `Fecha`) se resuelven por *tipo* en runtime via `fetchTasksSchema()`, así que un workspace puede renombrarlos sin romper la edición. Las propiedades de **solo-lectura** (`Nombre`, `Proyecto`, `Descripción`) siguen acopladas al template.

**Query (no completadas):**
```json
{
  "page_size": 100,
  "filter": { "property": "Status", "status": { "does_not_equal": "Completed" } }
}
```

**Nota sobre paginación:** `page_size: 100` es el máximo que retorna Notion por request. Si la respuesta incluye `has_more: true` y `next_cursor`, hay más datos. La app NO implementa paginación automática — se asume que el usuario tiene ≤100 tareas activas.

### 3. Proyectos

| Propiedad | Tipo | Valores |
|-----------|------|---------|
| Name | title | `.title[0]?.plain_text` |
| Status | status | Inbox, Not Started, In Progress, On Hold, Completed |
| Prioridad | select | Urgent, High, Medium, Low |
| Area | relation | Solo IDs — no resolver nombres en v1 |
| Archivo | checkbox | `.checkbox` → true/false |

> Igual que en Tareas: `Status` y `Prioridad` se resuelven por tipo en runtime via `fetchProjectsSchema()`. El resto sigue acoplado al template.

**Query (no archivados):**
```json
{
  "page_size": 100,
  "filter": { "property": "Archivo", "checkbox": { "equals": false } }
}
```

## Cloud Function — Proxy CORS

```typescript
// functions/src/index.ts
import { onRequest } from "firebase-functions/v2/https";

const ALLOWED_PATH_PREFIXES = ["databases/", "pages/", "search"];
const ALLOWED_METHODS = ["GET", "POST", "PATCH"];

export const notionProxy = onRequest({ cors: true }, async (req, res) => {
  if (!ALLOWED_METHODS.includes(req.method)) {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const token = req.headers["x-notion-token"] as string;
  if (!token) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  const path = req.query.path as string;
  if (!path) {
    res.status(400).json({ error: "No path provided" });
    return;
  }

  const isAllowed = ALLOWED_PATH_PREFIXES.some(prefix => path.startsWith(prefix));
  if (!isAllowed) {
    res.status(403).json({ error: "Path not allowed" });
    return;
  }

  try {
    const init: RequestInit = {
      method: req.method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
    };
    if (req.method !== "GET") {
      init.body = JSON.stringify(req.body);
    }
    const response = await fetch(`https://api.notion.com/v1/${path}`, init);

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: "Proxy error" });
  }
});
```

**Seguridad del proxy:**

| Path prefix | Métodos | Uso |
|-------------|---------|-----|
| `databases/` | GET (retrieve schema), POST (query) | Lectura de schemas dinámicos + queries de hábitos/tareas/proyectos |
| `pages/` | PATCH | Editar páginas (mutaciones inline de status, prioridad, fechas, checkboxes) |
| `search` | POST | Auto-descubrimiento de databases (`resolveDatabaseIds`) y test de conexión |

- Todos los demás paths/métodos retornan `403`/`405` desde el proxy sin tocar Notion.
- El token del usuario nunca se persiste en el servidor, solo se pasa como header de tránsito.
- `PATCH pages/{id}` solo puede modificar páginas a las que la integración del usuario ya tiene acceso. Notion garantiza el aislamiento.

**Errores tipados en el frontend:**
```typescript
// services/notion.ts
class NotionApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
class NotionPermissionError extends NotionApiError { /* 403 restricted_resource */ }
class MissingDbIdError extends Error { /* DB no resuelto */ }
class SchemaPropNotFoundError extends Error { /* prop esperada no encontrada en el schema */ }
```

**Test de conexión (Settings):**
```typescript
async function testConnection(): Promise<boolean> {
  // POST /search con page_size: 1 — válida el token sin depender
  // de un DB ID hardcoded. Si el token es válido y la integración
  // tiene al menos un recurso, devuelve OK.
  await callProxy("search", {
    body: { filter: { value: "database", property: "object" }, page_size: 1 },
  });
  return true;
}
```

## Token Store

Abstracción sobre localStorage para centralizar el acceso al token. Evita `localStorage.getItem("notion_token")` regado por el código y facilita cambiar el storage en el futuro.

```typescript
// services/tokenStore.ts
const TOKEN_KEY = "notion_token";

export const tokenStore = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string): void => localStorage.setItem(TOKEN_KEY, token),
  clear: (): void => localStorage.removeItem(TOKEN_KEY),
  exists: (): boolean => localStorage.getItem(TOKEN_KEY) !== null,
};
```

`services/dbIdsStore.ts` sigue el mismo patrón pero para los 3 DB IDs resueltos (`habits`, `tasks`, `projects`), con helpers para auto-resolución, override manual y detección de slots faltantes.

## Flujo Principal

### Primera vez

1. Usuario abre la app → `tokenStore.exists()` es false → redirige a `/settings`.
2. Ingresa su Notion Integration Token.
3. Click "Probar conexión" → `testConnection()` (POST `search` con `page_size: 1`).
4. Si éxito → el botón cambia a estado success (check verde + "Conexión exitosa") por 2 segundos.
5. Si error → mensaje inline ("Token inválido" o "Error de conexión").
6. `tokenStore.set(token)` → la app llama a `resolveDatabaseIds()` para encontrar los 3 DBs por nombre + schema.
7. **Si los 3 se resuelven sin ambigüedad** → al dashboard, carga datos.
8. **Si alguno queda *no resuelto* o *ambiguo*** → el panel **Databases** en Settings muestra cada slot con su estado (`Resuelto` / `Ambiguo` / `No encontrado` / `Manual`) y permite pegar el ID a mano. Cada slot guardado se persiste en `dbIdsStore`.

### Uso normal

1. App detecta token con `tokenStore.exists()` → carga los 3 datasets en paralelo.
2. Cada sección muestra skeleton/placeholder mientras carga (NO pantalla bloqueante).
3. Conforme llega cada dataset, el skeleton se reemplaza por los datos reales (carga progresiva, NO Promise.all).
4. Si un dataset falla, esa sección muestra error inline con botón de retry — las demás secciones funcionan normal.
5. Usuario navega por tabs: General, Hábitos, Tareas, Proyectos.
6. Click en ⚙️ navega a `/settings`.
7. Click en ↻ recarga los 3 datasets (siempre todos, independiente de la vista activa). El botón muestra spinner mientras carga y se desactiva para evitar doble-click. **Además, queda deshabilitado mientras `pendingMutations.size > 0`** — evita clobbering del estado optimista.
8. Click en un chip de status/prioridad o en una celda del heatmap → edición inline con optimistic update. El cambio aparece al instante; si Notion rechaza, rollback automático + toast.

### Manejo de errores

| Error | Comportamiento |
|-------|---------------|
| 401 Unauthorized | "Token inválido o expirado. Verificá en Settings." con link a `/settings` |
| 403 `restricted_resource` (mutación) | "Tu integración no tiene permisos de escritura. Andá a notion.so/my-integrations → tu integración → Capabilities → marcá 'Update content'." Rollback + toast |
| 429 Rate Limited | "Notion tiene límite de requests. Esperá unos segundos y recargá." No retry automático |
| 400 (mutación con valor inválido) | "Ese valor no existe en tu workspace. Refrescá Settings." Rollback |
| Network error (offline/timeout fetch) | "No se pudo conectar. Revisá tu conexión a internet." |
| Mutación colgada (>12s) | "La actualización está tardando demasiado. Verificá tu conexión y reintentá." Rollback + se libera de `pendingMutations` |
| Error parcial (1 dataset falla) | Solo esa sección muestra error inline con botón "Reintentar". Las demás funcionan normal |
| 500+ Server error | "Error del servidor. Intentá de nuevo en unos minutos." |

### Cambiar token / Borrar token

- **Cambiar:** Settings → ingresar nuevo token → "Probar conexión" → si éxito, `tokenStore.set(newToken)` → limpia datos en memoria → re-fetch automático. Si los DBs cambian de workspace, el panel **Databases** vuelve a pedir resolución.
- **Borrar:** Settings → "Desconectar" → dialog de confirmación → `tokenStore.clear()` → redirige a Settings.

## Overview — KPIs y Composición

### 4 KPIs (StatCards)

| KPI | Fuente | Cálculo |
|-----|--------|---------|
| % hábitos hoy | Habit Tracker | `completed.length / habitNames.length * 100` del registro más reciente. El denominador es **dinámico** — refleja la cantidad real de checkboxes en el database |
| Promedio hábitos (30d) | Habit Tracker | Promedio del % de completitud de los últimos 30 días |
| Tareas activas | Tareas | Count donde Status != "Completed" |
| Proyectos en progreso | Proyectos | Count donde Status == "In Progress" |

### Composición de la vista Overview

1. **4 StatCards** con los KPIs arriba.
2. **TrendLineChart** — tendencia de % hábitos últimos 30 días.
3. **TaskPieChart** — distribución de tareas por status.
4. **Lista compacta de proyectos en progreso** — solo los que tienen Status == "In Progress", con nombre + status badge. NO es un chart (pocos items harían un bar chart vacío). El `ProjectBarChart` con distribución completa por status va exclusivamente en la vista Proyectos.

## Navegación y Routing

**Router:** `react-router` v7 con las siguientes rutas:

| Ruta | Page | Notas |
|------|------|-------|
| `/` | Overview | Dashboard principal con KPIs |
| `/habits` | Habits | Heatmap + consistencia |
| `/tasks` | Tasks | Lista completa de tareas |
| `/projects` | Projects | Distribución + lista |
| `/settings` | Settings | Configuración del token + panel de Databases |

**Header/Layout:**
- **Desktop:** Tabs horizontales en el header (General, Hábitos, Tareas, Proyectos) + botón refresh (↻) + botón settings (⚙️) a la derecha.
- **Mobile:** Tabs scrolleables horizontalmente con `overflow-x-auto`. Mismo header pero los tabs se desplazan si no caben.
- Settings es una ruta separada (`/settings`), no un modal ni un tab.

**Guard de autenticación:** Wrapper condicional en `DashboardShell` (no como loader de React Router). Si `tokenStore.exists()` es false, renderiza `<Navigate to="/settings" />` en vez del layout con las rutas del dashboard. Settings siempre es accesible — queda fuera del guard.

## Custom Hook — useNotionData

**Principio clave: 3 fetches independientes, NO Promise.all.** Cada uno actualiza el estado al llegar.

**Ubicación del hook:** Se instancia UNA vez en `App.tsx` (dentro de `DashboardShell`) y los datos se pasan a las pages vía `useOutletContext`. Las pages NO instancian su propio hook — esto evita re-fetches al cambiar de tab.

```typescript
// Estado base
habits: HabitDay[] | null
habitNames: string[]                   // descubierto dinámicamente del schema (ver SPEC_DYNAMIC_HABITS)
tasks: Task[] | null
projects: Project[] | null
loading: { habits: boolean, tasks: boolean, projects: boolean }
errors: { habits?: string, tasks?: string, projects?: string }
dbIdsMissing: DbKey[]                  // qué DB IDs no se pudieron resolver

// Schemas para edición (cargados una vez al montar, después de que dbIdsStore esté completo)
tasksSchema: DbSchema | null           // resuelto por tipo, no por nombre literal
projectsSchema: DbSchema | null

// Estado de mutaciones optimistas
pendingMutations: Set<string>          // claves "${pageId}:${field}" en vuelo

// Datos derivados (useMemo)
habitTrend: { date, pct, count }[]
avgPct: number
todayData: { pct, count } | null
tasksByStatus: Record<string, number>
projectsByStatus: Record<string, number>
habitFreq: { name, full, pct }[]       // name = abreviación del helper habitAbbreviation()

// Acciones
refresh(): bloqueado mientras pendingMutations.size > 0
updateHabit(dayPageId, habit, value): toggle optimista de un checkbox
updateTask(taskId, fields): edición inline de status/prioridad/fecha
updateProject(projectId, fields): edición inline de status/prioridad
```

> La infraestructura completa de mutaciones (coalescing, serialización por clave, timeout 12s, rollback, manejo de errores tipados) está documentada en [SPEC_INTERACTIVE_EDITS.md](SPEC_INTERACTIVE_EDITS.md).

## Heatmap — Consideraciones de Layout

El heatmap muestra N hábitos × 30 días, donde N depende del database del usuario (típicamente 14 en el template base, pero puede variar). Esto presenta un reto en pantallas pequeñas.

**Escala visual (por celda individual):**
- **Hecho** (checkbox true): color accent del tema (verde/esmeralda).
- **No hecho** (checkbox false): color muted (gris oscuro, perceptible pero no invasivo).
- **Sin registro** (día sin entrada en la DB): color más oscuro/neutro, distinto del "no hecho" — indica que no hay datos, no que falló.

**Tooltip al hover:** Muestra fecha + nombre del hábito + estado ("Completado" / "No completado" / "Sin registro").

**Interactividad:** click en una celda con estado "Hecho" o "No hecho" togglea el checkbox del hábito en Notion (optimistic update). Las celdas "Sin registro" no son clickeables — crear el día requeriría POST a `/v1/pages` con el template completo, fuera de alcance.

**Desktop (≥768px):** Grid completo, 30 columnas visibles. Labels de hábitos a la izquierda, fechas arriba.

**Mobile (<768px):** Scroll horizontal con `overflow-x-auto`, el grid mantiene su tamaño natural. Fade gradient en el borde derecho como indicador visual de que hay más contenido.

## Recharts — Custom Tooltips

Los tooltips por defecto de Recharts usan estilos blancos genéricos que rompen con el tema dark. El componente `ChartTooltip.tsx` reutilizable:

- Fondo oscuro consistente con las cards del dashboard.
- Borde sutil (1px solid con el color de borde del tema).
- Tipografía Outfit para labels, JetBrains Mono para valores numéricos.
- Sombra sutil para distinguirlo del contenido detrás.

```typescript
// Uso en Recharts:
<Tooltip content={<ChartTooltip />} />
```

## Responsive — Breakpoints y Layout

| Componente | Desktop (≥1024px) | Tablet (≥768px) | Mobile (<768px) |
|------------|-------------------|-----------------|-----------------|
| StatCards | Grid 4 columnas | Grid 2 columnas | Stack 1 columna |
| Tabs (nav) | Horizontal en header | Horizontal en header | Scroll horizontal con `overflow-x-auto` |
| Heatmap | Grid completo 30 cols | Grid completo con scroll | Scroll horizontal + fade |
| Charts | Ancho completo | Ancho completo | Ancho completo, altura reducida |
| TaskList / ProjectList | Tabla con columnas | Tabla con columnas reducidas | Cards stacked (una card por item). Cada componente maneja internamente ambos modos de render con un breakpoint via Tailwind (`hidden md:block` / `block md:hidden`) |
| Settings | Centered card, max-width | Centered card | Full width con padding |

## Empty States

Cada sección debe manejar el caso de no tener datos con un mensaje claro:

| Sección | Mensaje | CTA |
|---------|---------|-----|
| Hábitos (sin registros) | "No hay registros de hábitos en los últimos 30 días" | — |
| Hábitos (DB sin checkboxes) | "No hay hábitos configurados en tu database de Notion. Agregá propiedades de tipo checkbox al database para que aparezcan acá." | — |
| Tareas (sin tareas activas) | "No hay tareas activas. ¡Todo al día!" | — |
| Proyectos (sin proyectos) | "No hay proyectos activos" | — |
| Usuario nuevo (token OK, sin datos) | "Tu workspace está conectado pero aún no tiene datos en las bases esperadas" | Link a documentación de la plantilla si aplica |
| Overview (sin datos en ningún dataset) | Las 4 StatCards muestran "—" y las secciones de charts muestran su empty state individual | — |

Los empty states usan un icono relevante de Lucide + el mensaje en texto secundario, centrados en el espacio de la sección.

## Restricciones y Decisiones

| Decisión | Razón |
|----------|-------|
| Token en localStorage vía `tokenStore` | Permite que cualquier usuario con la plantilla lo use sin backend propio. Wrapper centralizado para flexibilidad futura |
| Proxy Cloud Function con path allowlist | Notion API bloquea CORS. Proxy restringido a `databases/`, `pages/`, `search` para evitar acceso a endpoints sensibles |
| 3 fetches independientes | Carga progresiva — no bloquear toda la UI si un fetch tarda |
| Hook único en App.tsx | Evita re-fetches al cambiar de tab. Los datos se pasan a las pages vía outlet context |
| No resolver relaciones (Proyecto→nombre, Area→nombre) | Requeriría N+1 queries adicionales. En v1 solo mostramos datos directos |
| `page_size: 100` sin paginación | Suficiente para uso personal. Limitación documentada, paginación en v2 si es necesario |
| Recharts con hex hardcodeados + custom tooltips | Recharts no acepta tokens CSS. Tooltips custom para mantener consistencia visual |
| shadcn/ui + Tailwind, no MUI | Control total del diseño, bundle más liviano |
| Refresh recarga los 3 datasets siempre | Simplicidad. No vale la pena la complejidad de refresh selectivo por vista |
| Auto-resolución de DB IDs vía `search` + heurística | Permite usar la app sin hardcodear IDs por workspace. Override manual desde Settings si la auto-resolución falla |
| Hábitos descubiertos dinámicamente del schema | Cualquier cambio de checkboxes en Notion se refleja al refrescar, sin redeploy. Ver [SPEC_DYNAMIC_HABITS.md](SPEC_DYNAMIC_HABITS.md) |
| Optimistic updates con timeout 12s + rollback | UX premium: el dashboard se siente vivo. El rollback garantiza que el estado nunca quede inconsistente. Ver [SPEC_INTERACTIVE_EDITS.md](SPEC_INTERACTIVE_EDITS.md) |

## Features posteriores al MVP

Después de la primera versión read-only se agregaron dos features que extendieron el alcance del dashboard. Cada uno tiene su propio spec:

- **Edición interactiva** ([SPEC_INTERACTIVE_EDITS.md](SPEC_INTERACTIVE_EDITS.md)) — habilitó PATCH a Notion desde la UI con optimistic updates, schemas dinámicos para Tareas/Proyectos (resolución de propiedades editables por *tipo*, no por nombre literal), sistema de toasts local, y la matriz completa de manejo de errores de mutaciones (403 sin permisos, 429, 400, network, timeout 12s).
- **Hábitos dinámicos** ([SPEC_DYNAMIC_HABITS.md](SPEC_DYNAMIC_HABITS.md)) — eliminó `HABITS_LIST` y `HABIT_ABBREVIATIONS` de `constants.ts`. La app ahora descubre los hábitos del schema del database en runtime (`extractHabitNames()`), con blacklist mínima (`Archive`) y truncate automático para los labels del chart (`habitAbbreviation()` en `lib/habitLabel.ts`).

## Variables de Entorno

```bash
# .env (desarrollo)
VITE_PROXY_URL=http://localhost:5001/{PROJECT_ID}/us-central1/notionProxy

# .env.production (producción)
VITE_PROXY_URL=https://us-central1-{PROJECT_ID}.cloudfunctions.net/notionProxy
```
