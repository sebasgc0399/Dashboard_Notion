# SPEC — Dashboard Interactivo (Edición de Notion desde la app)

> Feature spec para habilitar escritura sobre Notion desde el dashboard. Hoy la app es read-only; este documento define cómo permitir editar hábitos, tareas y proyectos directamente desde las vistas existentes, manteniendo la sensación instantánea de un dashboard premium.

## Contexto

El dashboard ya consume datos de Notion en modo lectura. Cada vez que el usuario quiere actualizar un check de hábito, cambiar el status de una tarea, mover una prioridad o ajustar una fecha, tiene que abrir Notion en otra pestaña. Eso rompe el flujo y le quita valor al dashboard como herramienta de uso diario.

El objetivo es **eliminar el viaje a Notion** para las acciones más frecuentes, sin volver al dashboard una herramienta de gestión completa (eso es Notion). Solo las ediciones que se hacen "al pasar".

## Objetivos

- Permitir al usuario editar inline los campos más usados sin salir del dashboard.
- Que la sensación al click sea **instantánea** (sub-50ms percibido), no "loading + wait".
- Que cualquier error con Notion se recupere visualmente sin que el usuario pierda confianza en lo que ve en pantalla.
- Soportar workspaces personalizados (status/prioridades distintas a las del template base).

## No-Objetivos (explícitamente fuera del alcance)

- Crear nuevas tareas, proyectos o días de hábito desde el dashboard.
- Editar nombres, descripciones, relaciones (Proyecto, Area).
- Archivar / borrar items.
- Drag & drop entre columnas (kanban).
- Bulk edit (seleccionar varios items y editar a la vez).
- Historial de cambios / undo persistente más allá del rollback inmediato por error.
- Sincronización en tiempo real con cambios externos hechos en Notion (sigue habiendo refresh manual).

## Alcance del feature

| Vista | Campo editable | Tipo de edición | Notas |
|-------|----------------|-----------------|-------|
| Hábitos | Checkbox de cada hábito por día | Toggle (click en celda del heatmap) | Solo días que **ya existen** en el database. No crea días nuevos. |
| Tareas | Status | Dropdown inline | Opciones leídas del schema del database. |
| Tareas | Prioridad | Dropdown inline | Opciones leídas del schema del database. |
| Tareas | Fecha | Date picker inline | Permite limpiar la fecha (`null`). |
| Proyectos | Status | Dropdown inline | Opciones leídas del schema del database. |
| Proyectos | Prioridad | Dropdown inline | Opciones leídas del schema del database. |

## Decisiones tomadas

Estas decisiones ya están confirmadas con el usuario y son la base del diseño:

| Decisión | Elegido | Razón |
|----------|---------|-------|
| Estrategia de update | **Optimistic + rollback** | Mejor UX, el dashboard se siente vivo. El costo de implementación es aceptable. |
| Fuente de opciones para selects | **Fetch del schema con `GET /databases/{id}`** | Soporta workspaces personalizados (status/prioridades custom). Llamada única al cargar la app, cacheada. |
| Ubicación del editor | **Inline en la lista** (sin modal) | Mínimo cambio visual sobre las vistas actuales. Click directo en el badge/celda. |
| Date picker (Tareas) | **`<input type="date">` nativo** | Cero dependencias, suficiente para v1. Se puede mejorar después si el look molesta. |
| Toast system | **Implementación local (~80 líneas)** | Mini event emitter + componente. Evita traer una librería entera para algo tan acotado. |
| Creación de días de hábito nuevos | **Fuera del alcance** | Es un flujo distinto: hay que conocer el template de propiedades del database y crear la página con todos los checkboxes en false. Queda como feature separado. |
| Refresh del schema | **Solo al cargar la app** | El schema cambia muy raramente. Si alguien lo modifica en Notion mientras usa el dashboard, recargar la página alcanza. |
| PATCH por checkbox de hábito | **Uno por uno, sin batchear** | Rollback parcial sería un infierno. Ver sección "Un PATCH por checkbox de hábito". |
| Timeout de mutación | **12 segundos** | Evita que una mutación colgada bloquee el refresh indefinidamente. Ver "Timeout de seguridad". |
| Resolución de nombres de propiedades editables | **Por tipo desde el schema** (`status` → primera prop con type `status`, `priority` → primera con type `select`, `date` → primera con type `date`) | Soporta workspaces que renombran propiedades. Cero costo marginal porque el GET al schema ya se hace para los selects. |

## Restricciones técnicas y dependencias

### Permisos de la integración de Notion

**Bloqueante:** la integración del usuario debe tener habilitada la capability **"Update content"** en `notion.so/my-integrations`. Hoy la app solo necesita "Read content" y muchos usuarios la van a tener configurada así. Si falta el permiso, los PATCH devuelven `403 restricted_resource`.

→ La app debe **detectar este 403 específicamente** y mostrar un mensaje accionable: *"Tu integración no tiene permisos de escritura. Andá a notion.so/my-integrations → tu integración → Capabilities → marcá 'Update content'."*

### Rate limit de Notion

- Notion permite **3 req/seg promedio** por integración.
- Una sesión normal de edición no se acerca al límite, pero si el usuario clickea muchos checkboxes seguidos hay que evitar saturar.
- **Mitigación:** queue secuencial por entidad (todas las ediciones a la misma página se serializan), con coalescing de PATCH a la misma propiedad (si el usuario togglea dos veces en 200ms, mandamos solo el último estado).

### Concurrencia con refresh

- Si el usuario apreta refresh mientras hay PATCHes en vuelo, el refresh puede traer datos viejos y "deshacer" visualmente cambios optimistas que aún no llegaron a Notion.
- **Mitigación:** el botón refresh queda disabled mientras `pendingMutations.size > 0`.

### Timeout de seguridad para mutaciones colgadas

- Si una mutación queda colgada (red lenta, función fría, Notion sin responder) el refresh queda bloqueado indefinidamente y el usuario queda atrapado.
- **Mitigación:** cada mutación tiene un **timeout duro de 12 segundos**. Si vence:
  - Se hace rollback al snapshot previo.
  - Se elimina de `pendingMutations`.
  - Se muestra toast: *"La actualización está tardando demasiado. Verificá tu conexión y reintentá."*
  - Si la mutación eventualmente llega a Notion después del timeout, el siguiente refresh la va a reflejar igual — no es un problema de consistencia, solo de UX percibida.

## Cambios en el Backend (proxy)

Hoy el proxy ([functions/src/index.ts](functions/src/index.ts)) está configurado así:

```typescript
const ALLOWED_PATH_PREFIXES = ["databases/", "search"];
const ALLOWED_METHODS = ["POST"];
```

### Cambios necesarios

1. **Agregar `PATCH` y `GET` a `ALLOWED_METHODS`.**
   - `PATCH` para actualizar páginas (`PATCH /v1/pages/{id}`).
   - `GET` para retrieve del schema del database (`GET /v1/databases/{id}`).

2. **Agregar prefijos al allowlist:**
   - `pages/` — para PATCH `pages/{id}`.
   - El prefijo `databases/` ya cubre tanto `databases/{id}/query` (POST) como `databases/{id}` (GET).

3. **Reenviar el body solo en POST/PATCH.** Los GET no tienen body; hoy el código siempre hace `JSON.stringify(req.body)` y eso puede romper el GET. Hay que skipear el body para `req.method === "GET"`.

4. **Reenviar el método correcto a Notion.** Hoy el proxy usa `req.method` directamente, lo cual ya estaría bien una vez que `PATCH` y `GET` pasen el filtro de `ALLOWED_METHODS`.

### Diff conceptual

```typescript
const ALLOWED_PATH_PREFIXES = ["databases/", "pages/", "search"];
const ALLOWED_METHODS = ["GET", "POST", "PATCH"];

// ...
const init: RequestInit = {
  method: req.method,
  headers: { /* idem */ },
};
if (req.method !== "GET") {
  init.body = JSON.stringify(req.body);
}
const response = await fetch(`https://api.notion.com/v1/${path}`, init);
```

### Seguridad

- El allowlist sigue siendo restrictivo: solo `databases/`, `pages/` y `search`. **No** se habilita `users/`, `blocks/` ni `comments/`.
- El token sigue siendo per-request, sin persistencia en el servidor.
- `PATCH pages/{id}` solo puede modificar páginas a las que la integración del usuario ya tiene acceso. Notion garantiza el aislamiento.

## Cambios en `services/notion.ts`

### Nuevas funciones

```typescript
// Schema fetching — devuelve las opciones válidas + los nombres reales de las propiedades
export interface DbSchema {
  statusPropName: string;          // ej. "Status" o lo que tenga el usuario
  status: SchemaOption[];
  priorityPropName: string;        // ej. "Prioridad" / "Priority"
  priority: SchemaOption[];
  datePropName?: string;           // solo presente en Tasks (ej. "Fecha" / "Due Date")
}

export async function fetchTasksSchema(): Promise<DbSchema>;
export async function fetchProjectsSchema(): Promise<DbSchema>;

// Mutaciones — todas reciben el schema correspondiente para resolver los nombres reales
export async function updateHabitCheckbox(
  pageId: string,
  habitName: string,
  value: boolean
): Promise<void>;

export async function updateTaskFields(
  pageId: string,
  fields: { status?: string; priority?: string | null; date?: string | null },
  schema: DbSchema
): Promise<void>;

export async function updateProjectFields(
  pageId: string,
  fields: { status?: string; priority?: string | null },
  schema: DbSchema
): Promise<void>;
```

### Implementación

- `fetchTasksSchema()` y `fetchProjectsSchema()` hacen `GET databases/{id}` y recorren `properties` buscando **por tipo**, no por nombre:
  - `status`: la primera propiedad con `type: "status"` → `statusPropName` y `status` (opciones de `properties[name].status.options`).
  - `select` (Prioridad): la primera con `type: "select"` → `priorityPropName` y `priority`.
  - `date` (Fecha en Tasks): la primera con `type: "date"` → `datePropName`. Solo se resuelve para Tasks (Projects no edita fecha).
  - Si no encuentra una propiedad esperada, lanza una nueva clase `SchemaPropNotFoundError extends Error` que la UI traduce a un mensaje accionable: *"No se encontró una propiedad de tipo Status en tu database de Tareas. ¿Está bien configurada?"*

- **Hábitos no necesita schema fetch.** El único campo editable de hábitos son los checkboxes, y `updateHabitCheckbox(pageId, habitName, value)` usa `habitName` directamente como nombre de propiedad (acoplamiento explícito con `HABITS_LIST` — los nombres del hábito son a la vez los nombres de las propiedades en Notion). La propiedad `Date` de hábitos sigue siendo de solo lectura y queda como literal en `fetchHabits()`, consistente con la regla de "solo resolvemos por tipo lo que editamos".
- Las funciones `update*` reciben el schema correspondiente y arman el body usando los nombres reales — **nunca con strings literales**:
  - `updateTaskFields(pageId, fields, schema)`:
    ```typescript
    // Si fields.status === "En proceso":
    { [schema.statusPropName]: { status: { name: fields.status } } }
    // Si fields.priority === "Alta":
    { [schema.priorityPropName]: { select: { name: fields.priority } } }
    // Si fields.priority === null (limpiar):
    { [schema.priorityPropName]: { select: null } }
    // Si fields.date === "2026-04-07":
    { [schema.datePropName!]: { date: { start: fields.date } } }
    ```
  - `updateProjectFields(pageId, fields, schema)` análogo, sin `date`.
  - `updateHabitCheckbox(pageId, habitName, value)`: el `habitName` viene de `HABITS_LIST`. El nombre de la propiedad checkbox **es** el nombre del hábito ("Ejercicio", "Codear", etc.), no requiere resolución desde el schema (ver nota de alcance abajo).
- Cualquier 403 se envuelve en `NotionPermissionError extends NotionApiError` para que la UI muestre el mensaje específico de "falta capability Update content".
- Cualquier 400 con `code: "validation_error"` sugiere que el schema cacheado quedó desactualizado (el usuario cambió el schema en Notion mientras la app tenía la versión vieja). El mensaje del toast debe sugerir recargar la página.

### Nota — qué resolvemos por tipo y qué no

Solo resolvemos por tipo las propiedades **editables desde la UI** de este feature: Status, Prioridad, Fecha (Tasks) y Date (Habits). Las propiedades de **solo lectura** que ya estaban hardcodeadas en `fetchHabits/Tasks/Projects` (`Nombre`, `Name`, `Archivo`, `Proyecto`, `Descripción`, los 14 nombres de checkboxes de hábitos en `HABITS_LIST`) se mantienen como están — son acoplamientos conscientes con la estructura del template del Segundo Cerebro. Hacerlas configurables requeriría mapeos de UI mucho más grandes que exceden el alcance de este feature.

### Schema cache

- Los schemas cambian muy raramente. Se fetchean **los 2 schemas (Tasks, Projects) en paralelo, una sola vez al cargar la app** después de que `dbIdsStore.isComplete()` sea true.
- Se guardan en estado de React (no en `localStorage`) — si el usuario duplica la app o cambia el token, se vuelven a fetchear.
- Si **alguno** de los 2 fetches falla:
  - Los dropdowns que dependen de las **opciones** (Status, Prioridad) caen a un fallback degradado: derivar opciones únicas de los datos ya cargados (`new Set(tasks.map(t => t.status))`).
  - Las **mutaciones** que dependen del nombre de propiedad de ese schema quedan **disabled** (no podemos editar Status si no sabemos cómo se llama la propiedad). El badge sigue siendo clickeable visualmente pero al click muestra un toast informativo: *"No se pudo cargar el schema de Tareas. Recargá la página."*
- **Hábitos** no tiene schema cache porque no necesita resolución dinámica de propiedades (ver nota más arriba).

## Cambios en `types/index.ts`

```typescript
export interface SchemaOption {
  name: string;
  color: string;
}

export interface DbSchema {
  statusPropName: string;
  status: SchemaOption[];
  priorityPropName: string;
  priority: SchemaOption[];
  datePropName?: string;          // solo para Tasks
}

export interface PendingMutation {
  id: string;            // ej. "${pageId}:status" o "${pageId}:${habitName}"
  startedAt: number;
}

// NotionData se extiende:
export interface NotionData {
  // ... campos existentes
  tasksSchema: DbSchema | null;
  projectsSchema: DbSchema | null;
  pendingMutations: Set<string>;       // ids en vuelo
  updateHabit: (dayPageId: string, habit: string, value: boolean) => void;
  updateTask: (taskId: string, fields: TaskUpdate) => void;
  updateProject: (projectId: string, fields: ProjectUpdate) => void;
}
```

## Patrón de Optimistic Update

Toda mutación pasa por el mismo flujo en `useNotionData`:

```
1. Usuario clickea
2. Capturar snapshot del valor previo (para rollback)
3. Aplicar el cambio al estado local inmediatamente
4. Marcar la mutación como "pending" (pendingMutations.add(mutId))
5. Arrancar timeout de 12s en paralelo
6. Llamar a la función update* del servicio
7a. Éxito (antes del timeout) → cancelar timeout, eliminar de pendingMutations, listo
7b. Error de Notion → cancelar timeout, revertir al snapshot, eliminar de pendingMutations, mostrar toast
7c. Timeout vence antes que la respuesta → revertir al snapshot, eliminar de pendingMutations, toast "tardando demasiado". La promesa real puede seguir corriendo en background pero ya no afecta al estado local; el próximo refresh va a reflejar el resultado real.
```

### Coalescing y serialización

- Se mantiene un `Map<string, Promise<void>>` de mutaciones en vuelo. La **clave** depende del tipo:
  - **Tareas / Proyectos:** `${pageId}:${field}` (ej: `"abc-123:status"`, `"abc-123:priority"`).
  - **Hábitos:** `${pageId}:${habitName}` (ej: `"day-2026-04-07:Ejercicio"`). **No** usar `"checkbox"` como discriminador, porque una misma página de día tiene 14 checkboxes distintos y se pisarían entre sí.
- Si llega una mutación nueva con la misma clave que una en vuelo, se encadena (`previous.then(() => newMutation())`) en vez de paralelizar. Esto garantiza orden consistente con Notion.
- Si llegan dos mutaciones encoladas para la misma clave antes de que la primera empiece, se **descarta la del medio** y solo queda la última (coalescing). Evita PATCH redundantes cuando el usuario togglea rápido.

### Un PATCH por checkbox de hábito (no batchear)

Notion permite enviar múltiples propiedades en un mismo PATCH a una página. La tentación es: si el usuario togglea 3 hábitos del mismo día rápido, mandar un solo PATCH con los 3 checkboxes. **No lo vamos a hacer.** Razones:

- El rollback parcial es un infierno: si Notion acepta 2 de 3 propiedades y rechaza 1 (ej. por validación), no hay forma limpia de saber cuál falló y revertir solo esa en el estado local.
- La serialización por clave (`pageId:habitName`) deja de funcionar — habría que coordinar locks por página entera, lo cual bloquea ediciones legítimamente concurrentes en distintos hábitos.
- La ganancia de performance es marginal: 3 PATCHes a la misma página caben holgados en el rate limit de Notion (3 req/seg).

**Regla:** `updateHabitCheckbox()` siempre hace **un PATCH por llamada con una sola propiedad**. Cero batching.

## Cambios en la UI

### Hábitos — `HabitHeatmap.tsx`

**Hoy:** las celdas son visualmente estáticas, solo tooltip al hover.

**Cambio:**
- Cada celda se vuelve clickeable. Click → `updateHabit(dayPageId, habitName, !currentValue)`.
- Visual feedback: cursor `pointer` + transición de color al hover.
- Mientras la celda está en `pendingMutations`, se le aplica un opacity sutil (no spinner — sería visualmente ruidoso a esa escala).
- Las celdas "sin registro" (días que no existen en el database) **no son clickeables** — se mantienen como hoy. Para crearlas habría que hacer POST a `/v1/pages` con `parent: { database_id }`, y eso queda fuera del alcance de este feature.
- Para saber el `pageId` de cada día, `fetchHabits()` debe pasar a devolver `id` además de `date/completed/pct`. Hoy lo descarta.

### Tareas — `TaskList.tsx`

**Hoy:** muestra `Status`, `Prioridad`, `Fecha` como chips/texto estáticos.

**Cambio:**
- **Status**: el `StatusChip` se vuelve un trigger de un Popover (base-ui ya está disponible vía `@base-ui/react`) con la lista de opciones del schema. Click en una opción → `updateTask(id, { status: option.name })`.
- **Prioridad**: idem. Permite además seleccionar "Sin prioridad" → `updateTask(id, { priority: null })`.
- **Fecha**: click en la celda abre un date picker simple (input nativo `type="date"` envuelto, suficiente para v1). Permite limpiar → `updateTask(id, { date: null })`.
- Mientras una mutación de la fila está pending, la fila entera tiene un `opacity: 0.7` y los triggers están disabled.

**Modo mobile (cards stacked):** mismo comportamiento, los triggers son los mismos badges.

### Proyectos — `ProjectList.tsx`

**Hoy:** muestra `Status` y `Prioridad` como chips estáticos.

**Cambio:** idéntico a Tareas pero sin fecha. Sin novedades adicionales.

### Componente nuevo: `SelectPopover`

Para no duplicar lógica, se crea un componente reutilizable que envuelve un trigger (children) y muestra un popover con opciones tipadas:

```typescript
interface SelectPopoverProps {
  options: SchemaOption[];
  value: string | null;
  allowClear?: boolean;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  children: React.ReactNode;  // el trigger (StatusChip, etc.)
}
```

Implementado con `Popover` de `@base-ui/react`. Los colores de cada opción usan los hex del schema de Notion (mapeados a Tailwind classes mediante un helper).

### Toasts de error

Hoy no hay sistema de toasts en la app. Para este feature alcanza con un componente ligero local — un único `Toast` montado en `Layout.tsx` que escucha un context/store muy simple. **Alternativa**: usar el `Dialog` que ya existe (`@base-ui/react`) en modo no-bloqueante. **Decisión:** crear `services/toastStore.ts` como mini event emitter + `components/Toaster.tsx` con queue y auto-dismiss a 4s. Más simple que traer una dependencia nueva.

## Manejo de errores

| Caso | Detección | Mensaje al usuario | Acción |
|------|-----------|-------------------|--------|
| 403 falta permiso "Update content" | `NotionPermissionError` | "Tu integración no tiene permisos de escritura. Andá a Settings o a notion.so/my-integrations." | Rollback + toast con link |
| 401 token inválido | `NotionApiError.status === 401` | "Token expirado. Reconectá en Settings." | Rollback + toast con link a `/settings` |
| 429 rate limit | `NotionApiError.status === 429` | "Notion está limitando requests. Esperá unos segundos." | Rollback + toast |
| 400 bad request (valor inválido para select/status) | `NotionApiError.status === 400` | "Ese valor no existe en tu workspace. Refrescá Settings." | Rollback + toast — sugiere refrescar el schema |
| Network error / timeout | `TypeError` del fetch | "No se pudo conectar con Notion." | Rollback + toast |
| 500+ server error | `NotionApiError.status >= 500` | "Notion no está respondiendo. Intentá de nuevo en un minuto." | Rollback + toast |
| Mutación colgada (>12s) | Timeout local con `setTimeout` | "La actualización está tardando demasiado. Verificá tu conexión y reintentá." | Rollback + toast + liberar de `pendingMutations` para desbloquear refresh |

## Plan de Implementación

### Fase 1 — Backend
- [ ] Actualizar [functions/src/index.ts](functions/src/index.ts):
  - Agregar `"pages/"` a `ALLOWED_PATH_PREFIXES`.
  - Agregar `"GET"` y `"PATCH"` a `ALLOWED_METHODS`.
  - Skipear `body` cuando `req.method === "GET"`.
- [ ] `firebase deploy --only functions`.
- [ ] Smoke test: `curl -X PATCH .../pages/test-id -H "x-notion-token: invalid" ...` debe devolver 401 desde Notion (no 403/405 desde el proxy).

### Fase 2 — Servicios y tipos
- [ ] Extender [src/types/index.ts](src/types/index.ts) con `DbSchema` (con `*PropName`), `SchemaOption`, `TaskUpdate`, `ProjectUpdate`, `id` en `HabitDay`.
- [ ] Agregar `NotionPermissionError` y `SchemaPropNotFoundError` en [src/services/notion.ts](src/services/notion.ts).
- [ ] Implementar `fetchTasksSchema()` y `fetchProjectsSchema()` con resolución de propiedades **por tipo** (no por nombre literal). Hábitos no necesita schema fetch.
- [ ] Implementar `updateHabitCheckbox()`, `updateTaskFields()`, `updateProjectFields()`. Las funciones de tareas y proyectos reciben el schema correspondiente como parámetro y construyen el body con los `*PropName` resueltos — **nunca con strings literales** como `"Status"` o `"Prioridad"`.
- [ ] Modificar `fetchHabits()` para incluir `id` en cada `HabitDay`.
- [ ] Crear [src/services/toastStore.ts](src/services/toastStore.ts) (mini event emitter).

### Fase 3 — Hook
- [ ] Extender [src/hooks/useNotionData.ts](src/hooks/useNotionData.ts):
  - Cargar **los 2 schemas (tasks, projects) en paralelo** después de que `dbIdsStore.isComplete()` sea true.
  - Agregar `pendingMutations: Set<string>` al state.
  - Implementar `updateHabit`, `updateTask`, `updateProject` con el patrón optimistic + coalescing + serialización por clave (`${pageId}:${field}` para tasks/projects, `${pageId}:${habitName}` para habits) + timeout de 12s.
  - Las mutaciones de tasks/projects pasan el `tasksSchema`/`projectsSchema` correspondiente a las funciones de service.
  - Mapear `NotionPermissionError`, `SchemaPropNotFoundError` y demás casos a llamadas al `toastStore`.
  - Bloquear `refresh` cuando `pendingMutations.size > 0`.

### Fase 4 — Componentes reutilizables
- [ ] [src/components/SelectPopover.tsx](src/components/SelectPopover.tsx) — Popover de base-ui con opciones tipadas.
- [ ] [src/components/Toaster.tsx](src/components/Toaster.tsx) — queue + auto-dismiss montado en Layout.
- [ ] Helper para mapear colores de Notion (`blue`, `red`, etc.) a clases de Tailwind/hex del tema.

### Fase 5 — UI por vista
- [ ] [src/components/HabitHeatmap.tsx](src/components/HabitHeatmap.tsx): celdas clickeables, opacity en pending, disabled en "sin registro".
- [ ] [src/components/TaskList.tsx](src/components/TaskList.tsx): SelectPopover en Status y Prioridad, date picker en Fecha, opacity en fila pending.
- [ ] [src/components/ProjectList.tsx](src/components/ProjectList.tsx): SelectPopover en Status y Prioridad.
- [ ] [src/components/Layout.tsx](src/components/Layout.tsx): montar `<Toaster />`, deshabilitar refresh si `pendingMutations.size > 0`.

### Fase 6 — Verificación end-to-end
- [ ] Habilitar "Update content" en la integración personal.
- [ ] Toggle de un hábito → reflejado en Notion.
- [ ] Cambiar Status de una tarea → reflejado en Notion.
- [ ] Cambiar Prioridad de una tarea → reflejado.
- [ ] Asignar fecha a una tarea → reflejado.
- [ ] Limpiar fecha de una tarea (set null) → reflejado.
- [ ] Cambiar Status de un proyecto → reflejado.
- [ ] **Caso permiso faltante**: deshabilitar "Update content" en la integración, intentar editar → toast con instrucciones, rollback visual correcto.
- [ ] **Caso rate limit simulado**: clickear 20 checkboxes seguidos → no 429, las mutaciones se serializan/coalescen sin perder consistencia.
- [ ] **Caso refresh durante mutación**: iniciar una edición lenta, intentar refresh → botón disabled.
- [ ] **Caso valor inválido**: forzar un PATCH con un status que no existe → toast 400, rollback correcto.
- [ ] **Caso timeout (mutación colgada)**: en DevTools, throttle de red a "Slow 3G" (o usar un breakpoint en el proxy para retrasar la respuesta). Cambiar el status de una tarea. A los 12s verificar: rollback visual al valor original, toast *"La actualización está tardando demasiado..."*, y que el botón refresh del Layout vuelve a habilitarse.
- [ ] **Caso workspace con propiedades renombradas**: en Notion, renombrar `Prioridad` → `Priority` en el database de Tareas. Recargar la app. Verificar que (a) el dropdown de Prioridad sigue funcionando con las opciones correctas, y (b) un cambio de prioridad se persiste en Notion sin error 400.

### Fase 7 — Deploy
- [ ] `npm run build` exitoso.
- [ ] `firebase deploy` (functions ya deployadas en Fase 1, hosting acá).
- [ ] Smoke test en producción con la cuenta personal.
- [ ] Actualizar [README.md](README.md) con la nota de que la integración necesita "Update content" para usar el modo edición.

## Archivos a modificar / crear

**Modificar:**
- [functions/src/index.ts](functions/src/index.ts) — proxy: PATCH/GET + `pages/`
- [src/services/notion.ts](src/services/notion.ts) — schema fetch + mutaciones + `NotionPermissionError`
- [src/types/index.ts](src/types/index.ts) — DbSchema, SchemaOption, updates a NotionData
- [src/hooks/useNotionData.ts](src/hooks/useNotionData.ts) — optimistic updates + schema state
- [src/components/HabitHeatmap.tsx](src/components/HabitHeatmap.tsx) — celdas editables
- [src/components/TaskList.tsx](src/components/TaskList.tsx) — inline editing
- [src/components/ProjectList.tsx](src/components/ProjectList.tsx) — inline editing
- [src/components/Layout.tsx](src/components/Layout.tsx) — Toaster + refresh disabled
- [README.md](README.md) — sección sobre permisos de la integración

**Crear:**
- [src/components/SelectPopover.tsx](src/components/SelectPopover.tsx)
- [src/components/Toaster.tsx](src/components/Toaster.tsx)
- [src/services/toastStore.ts](src/services/toastStore.ts)

## Decisiones abiertas

Ninguna — todas cerradas en la sección "Decisiones tomadas". Listo para implementar.
