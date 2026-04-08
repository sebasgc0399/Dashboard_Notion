# SPEC — Edición interactiva (PATCH a Notion desde el dashboard)

> Documentación del feature de **edición interactiva** del dashboard: cómo el frontend escribe sobre Notion con optimistic updates, schemas dinámicos y rollback automático en caso de error. Esta es la referencia técnica del feature ya implementado y deployado. Para el panorama general del proyecto ver [SPEC.md](SPEC.md). Para el feature de hábitos descubiertos dinámicamente ver [SPEC_DYNAMIC_HABITS.md](SPEC_DYNAMIC_HABITS.md).

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

Las 6 ediciones que el feature habilita:

| Vista | Campo editable | Tipo de edición | Notas |
|-------|----------------|-----------------|-------|
| Hábitos | Checkbox de cada hábito por día | Toggle (click en celda del heatmap) | Solo días que **ya existen** en el database. No crea días nuevos. Los nombres de hábitos vienen de `habitNames` (descubiertos dinámicamente del schema, ver [SPEC_DYNAMIC_HABITS.md](SPEC_DYNAMIC_HABITS.md)). |
| Tareas | Status | Dropdown inline | Opciones leídas del schema del database. |
| Tareas | Prioridad | Dropdown inline | Opciones leídas del schema del database. |
| Tareas | Fecha | Date picker inline | Permite limpiar la fecha (`null`). |
| Proyectos | Status | Dropdown inline | Opciones leídas del schema del database. |
| Proyectos | Prioridad | Dropdown inline | Opciones leídas del schema del database. |

## Decisiones tomadas

Las decisiones que enmarcaron el diseño del feature, con el racional original:

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
| Coalescing de mutaciones | **Patrón de slots** (`Map<string, Slot>`) en lugar de promesas encadenadas | Más simple, sin riesgo de deadlocks. Ver "Coalescing y serialización por slot". |

## Restricciones técnicas y dependencias

### Permisos de la integración de Notion

**Bloqueante:** la integración del usuario debe tener habilitada la capability **"Update content"** en `notion.so/my-integrations`. La app originalmente solo necesitaba "Read content" y muchos usuarios la tienen configurada así. Si falta el permiso, los PATCH devuelven `403 restricted_resource`.

→ La app **detecta este 403 específicamente** (vía `NotionPermissionError`) y muestra un mensaje accionable: *"Tu integración no tiene permisos de escritura. Andá a notion.so/my-integrations → tu integración → Capabilities → marcá 'Update content'."*

### Rate limit de Notion

- Notion permite **3 req/seg promedio** por integración.
- Una sesión normal de edición no se acerca al límite, pero si el usuario clickea muchos checkboxes seguidos hay que evitar saturar.
- **Mitigación:** queue por slot (todas las ediciones a la misma página + campo se serializan), con coalescing de PATCH a la misma propiedad (si el usuario togglea dos veces en 200ms, mandamos solo el último estado).

### Concurrencia con refresh

- Si el usuario apreta refresh mientras hay PATCHes en vuelo, el refresh puede traer datos viejos y "deshacer" visualmente cambios optimistas que aún no llegaron a Notion.
- **Mitigación:** el botón refresh queda disabled mientras `pendingMutations.size > 0`. Si por alguna razón se llama a `refresh()` con mutaciones pendientes, el hook lo bloquea internamente y muestra un toast `info`: *"Esperá a que terminen las ediciones en curso."*

### Timeout de seguridad para mutaciones colgadas

- Si una mutación queda colgada (red lenta, función fría, Notion sin responder) el refresh queda bloqueado indefinidamente y el usuario queda atrapado.
- **Mitigación:** cada mutación tiene un **timeout duro de 12 segundos** (`MUTATION_TIMEOUT_MS` en `useNotionData.ts`). Si vence:
  - Se hace rollback al snapshot previo.
  - Se elimina de `pendingMutations`.
  - Se muestra toast: *"La actualización está tardando demasiado. Verificá tu conexión y reintentá."*
  - Si la mutación eventualmente llega a Notion después del timeout, el siguiente refresh la va a reflejar igual — no es un problema de consistencia, solo de UX percibida.

## Backend (proxy)

El proxy ([functions/src/index.ts](functions/src/index.ts)) acepta los métodos y paths necesarios para el feature. La configuración completa de la Cloud Function (allowlist de prefijos, métodos, headers, manejo del body para GET vs POST/PATCH) está documentada en [SPEC.md](SPEC.md) bajo "Cloud Function — Proxy CORS".

Resumen de lo que el proxy permite, y para qué lo usa este feature:

| Path prefix | Métodos | Uso del feature |
|-------------|---------|-----------------|
| `databases/` | GET | `fetchTasksSchema` / `fetchProjectsSchema` — retrieve del schema del database para resolver nombres de propiedades editables |
| `pages/` | PATCH | `updateHabitCheckbox` / `updateTaskFields` / `updateProjectFields` — todas las mutaciones inline van por acá |

### Seguridad

- El allowlist sigue siendo restrictivo: solo `databases/`, `pages/` y `search`. **No** se habilita `users/`, `blocks/` ni `comments/`.
- El token sigue siendo per-request, sin persistencia en el servidor.
- `PATCH pages/{id}` solo puede modificar páginas a las que la integración del usuario ya tiene acceso. Notion garantiza el aislamiento.

## `services/notion.ts` — schemas y mutaciones

### Funciones expuestas

```typescript
// Schema fetching — devuelve las opciones válidas + los nombres reales de las propiedades
export interface DbSchema {
  statusPropName: string;          // ej. "Status" o lo que tenga el usuario
  status: SchemaOption[];
  priorityPropName: string;        // ej. "Prioridad" / "Priority"
  priority: SchemaOption[];
  datePropName?: string;           // solo presente en Tasks (ej. "Fecha" / "Due Date")
}

export function fetchTasksSchema(): Promise<DbSchema>;
export function fetchProjectsSchema(): Promise<DbSchema>;

// Mutaciones — todas reciben el schema correspondiente para resolver los nombres reales
export function updateHabitCheckbox(
  pageId: string,
  habitName: string,
  value: boolean
): Promise<void>;

export function updateTaskFields(
  pageId: string,
  fields: { status?: string; priority?: string | null; date?: string | null },
  schema: DbSchema
): Promise<void>;

export function updateProjectFields(
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
  - Si no encuentra una propiedad esperada, lanza `SchemaPropNotFoundError extends Error` que la UI traduce a un mensaje accionable: *"No se encontró una propiedad de tipo Status en tu database de Tareas. ¿Está bien configurada?"*

- **Hábitos no necesita schema fetch.** El único campo editable de hábitos son los checkboxes, y `updateHabitCheckbox(pageId, habitName, value)` usa `habitName` directamente como nombre de propiedad. El nombre del hábito **es** el nombre de la propiedad checkbox en Notion. Los nombres se descubren dinámicamente vía `extractHabitNames()` en `fetchHabits` (ver [SPEC_DYNAMIC_HABITS.md](SPEC_DYNAMIC_HABITS.md)).

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
  - `updateHabitCheckbox(pageId, habitName, value)`: el `habitName` viene de `habitNames` (lista dinámica del schema). El nombre de la propiedad checkbox **es** el nombre del hábito ("Ejercicio", "Codear", etc.), no requiere resolución desde el schema.

- Cualquier 403 con `code: "restricted_resource"` se envuelve en `NotionPermissionError extends NotionApiError` para que la UI muestre el mensaje específico de "falta capability Update content".
- Cualquier 400 con `code: "validation_error"` sugiere que el schema cacheado quedó desactualizado (el usuario cambió el schema en Notion mientras la app tenía la versión vieja). El mensaje del toast sugiere recargar la página.

### Nota — qué resolvemos por tipo y qué no

Solo resolvemos por tipo las propiedades **editables desde la UI** de este feature: Status, Prioridad, Fecha (Tasks) y los checkboxes de Habits (descubiertos dinámicamente). Las propiedades de **solo lectura** que ya estaban hardcodeadas en `fetchTasks/Projects` (`Nombre`, `Name`, `Archivo`, `Proyecto`, `Descripción`, y la propiedad `Date` de hábitos) se mantienen como están — son acoplamientos conscientes con la estructura del template del Segundo Cerebro. Hacerlas configurables requeriría mapeos de UI mucho más grandes que exceden el alcance de este feature.

### Schema cache

- Los schemas cambian muy raramente. Se fetchean **los 2 schemas (Tasks, Projects) en paralelo, una sola vez al cargar la app** después de que `dbIdsStore.isComplete()` sea true.
- Se guardan en estado de React (no en `localStorage`) — si el usuario cambia el token, se vuelven a fetchear.
- Si alguno de los 2 fetches falla:
  - El estado correspondiente (`tasksSchema` o `projectsSchema`) queda en `null`.
  - Las mutaciones de esa entidad quedan **bloqueadas**: al intentar editar, `useNotionData.updateTask` / `updateProject` detecta el `null`, no envía el PATCH, y dispara un toast informativo: *"No se pudo cargar el schema de Tareas. Recargá la página."*
  - **Nota de divergencia con el diseño original**: el spec original proponía un fallback degradado donde los dropdowns derivaban opciones únicas desde los datos ya cargados (`new Set(tasks.map(t => t.status))`). No se implementó porque agregaba complejidad sin valor real — si el schema fetch falla, lo más probable es que el siguiente PATCH también falle (mismo problema de red o permisos), así que es preferible bloquear con un mensaje claro y dejar que el usuario recargue.
- **Hábitos** no tiene schema cache porque no necesita resolución dinámica de propiedades.

## Tipos públicos

```typescript
// services/notion.ts → re-exportados desde types/index.ts
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

export interface TaskUpdate {
  status?: string;
  priority?: string | null;
  date?: string | null;
}

export interface ProjectUpdate {
  status?: string;
  priority?: string | null;
}

// NotionData se extiende con (campos relevantes para este feature):
export interface NotionData {
  // ... resto de campos del feature read-only
  tasksSchema: DbSchema | null;
  projectsSchema: DbSchema | null;
  pendingMutations: Set<string>;       // claves "${pageId}:${field}" o "${pageId}:${habitName}"
  updateHabit: (dayPageId: string, habit: string, value: boolean) => void;
  updateTask: (taskId: string, fields: TaskUpdate) => void;
  updateProject: (projectId: string, fields: ProjectUpdate) => void;
}
```

> El spec original proponía una interface `PendingMutation { id, startedAt }`. La implementación final simplificó eso a `Set<string>` directamente — los timestamps no se usan en ningún lugar y agregaban complejidad sin valor.

## Patrón de Optimistic Update

Toda mutación pasa por el mismo flujo en `useNotionData`:

```
1. Usuario clickea
2. Capturar snapshot del valor previo (lastConfirmedValue)
3. Aplicar el cambio al estado local inmediatamente (applyValue)
4. Marcar la mutación como "pending" (pendingMutations.add(key))
5. Arrancar timeout de 12s en paralelo (Promise.race)
6. Llamar a la función update* del servicio
7a. Éxito (antes del timeout) → cancelar timeout, actualizar lastConfirmedValue, reprocesar el slot por si hay un valor más nuevo encolado
7b. Error de Notion → cancelar timeout, revertir al snapshot (applyValue(lastConfirmedValue)), eliminar de pendingMutations, mostrar toast
7c. Timeout vence antes que la respuesta → revertir al snapshot, eliminar de pendingMutations, toast "tardando demasiado". La promesa real puede seguir corriendo en background pero ya no afecta al estado local; el próximo refresh va a reflejar el resultado real.
```

### Coalescing y serialización por slot

La pieza central de la infraestructura de mutaciones es el `Map<string, Slot>` mantenido en `useNotionData` (`slotsRef`). Cada slot representa una mutación pendiente para una clave única:

```typescript
interface Slot {
  applyValue: (value: any) => void;          // cómo aplicar al estado local
  lastConfirmedValue: any;                   // último valor que Notion confirmó (para rollback)
  desiredValue: any;                         // valor objetivo más reciente que el usuario quiere
  sendPatch: (value: any) => Promise<void>;  // función que dispara el PATCH
  inFlight: boolean;                         // hay una request en vuelo
  errorContext: ErrorContext;                // metadata para el toast de error
}
```

La **clave** depende del tipo:
- **Tareas / Proyectos:** `${pageId}:${field}` (ej. `"abc-123:status"`).
- **Hábitos:** `${pageId}:${habitName}` (ej. `"day-2026-04-07:Ejercicio"`). **No** se usa `"checkbox"` como discriminador, porque una misma página de día tiene N checkboxes distintos y se pisarían entre sí.

**Flujo de coalescing** (`requestMutation` → `processSlot`):

1. Cuando llega una mutación nueva, `requestMutation` aplica el valor optimista al estado local **inmediatamente**.
2. Busca el slot existente por clave. Si no existe, crea uno con `lastConfirmedValue = initialValue` y `desiredValue = newValue`. Si existe, **actualiza solo `desiredValue`** (descarta el valor intermedio sin haberlo enviado — esto es el coalescing).
3. Llama a `processSlot(key)`.
4. `processSlot` chequea: si ya hay un PATCH en vuelo (`inFlight: true`), no hace nada — el slot queda pendiente y se reprocesará al volver de la request actual. Si `desiredValue === lastConfirmedValue`, limpia el slot.
5. Si no, marca `inFlight = true` y dispara `sendPatch(desiredValue)` con un `Promise.race` contra el timeout de 12s.
6. Cuando la promesa se resuelve, actualiza `lastConfirmedValue` y vuelve a llamar a `processSlot` recursivamente — esto garantiza que si el usuario cambió `desiredValue` mientras la primera request estaba en vuelo, se dispare una segunda con el valor más reciente (sin perder el orden).
7. Si falla, llama a `applyValue(lastConfirmedValue)` para hacer rollback al último valor confirmado, borra el slot, y dispara el toast de error correspondiente.

Este patrón **no usa promesas encadenadas**: el coalescing se logra reemplazando `desiredValue` in-place, y la serialización se logra con el flag `inFlight`. Más simple que un `Map<string, Promise<void>>` y menos propenso a deadlocks.

### Un PATCH por checkbox de hábito (no batchear)

Notion permite enviar múltiples propiedades en un mismo PATCH a una página. La tentación es: si el usuario togglea 3 hábitos del mismo día rápido, mandar un solo PATCH con los 3 checkboxes. **No se hace.** Razones:

- El rollback parcial es un infierno: si Notion acepta 2 de 3 propiedades y rechaza 1 (ej. por validación), no hay forma limpia de saber cuál falló y revertir solo esa en el estado local.
- La serialización por clave (`pageId:habitName`) deja de funcionar — habría que coordinar locks por página entera, lo cual bloquea ediciones legítimamente concurrentes en distintos hábitos.
- La ganancia de performance es marginal: 3 PATCHes a la misma página caben holgados en el rate limit de Notion (3 req/seg).

**Regla:** `updateHabitCheckbox()` siempre hace **un PATCH por llamada con una sola propiedad**. Cero batching.

## UI — componentes editables

### Hábitos — `HabitHeatmap.tsx`

- Cada celda con datos (estado "done" o "not_done") es clickeable. Click → `updateHabit(dayPageId, habitName, !currentValue)`.
- Visual feedback: cursor `pointer` + transición de color al hover.
- Mientras la celda está en `pendingMutations`, se le aplica un opacity sutil (no spinner — sería visualmente ruidoso a esa escala).
- Las celdas "sin registro" (días que no existen en el database) **no son clickeables** — se mantienen visualmente como hoy. Para crearlas habría que hacer POST a `/v1/pages` con `parent: { database_id }`, y eso queda fuera del alcance.
- `fetchHabits()` devuelve `id` por cada día (junto con `date/completed/pct`) para que el heatmap pueda pasarle el `pageId` correcto a la mutación.
- La lista de hábitos a renderizar viene de la prop `habitNames` (descubierta dinámicamente, ver [SPEC_DYNAMIC_HABITS.md](SPEC_DYNAMIC_HABITS.md)).

### Tareas — `TaskList.tsx`

- **Status**: el `StatusChip` es el trigger de un `SelectPopover` con la lista de opciones del schema (`tasksSchema.status`). Click en una opción → `updateTask(id, { status: option.name })`.
- **Prioridad**: idem, con `tasksSchema.priority`. Permite además seleccionar "Sin prioridad" (`allowClear`) → `updateTask(id, { priority: null })`.
- **Fecha**: input nativo `type="date"` envuelto en el chip. Permite limpiar → `updateTask(id, { date: null })`.
- Mientras una mutación de la fila está pending, la fila tiene un `opacity` reducido y los triggers están disabled.

**Modo mobile (cards stacked):** mismo comportamiento, los triggers son los mismos badges.

### Proyectos — `ProjectList.tsx`

Idéntico a Tareas pero sin fecha. Sin novedades adicionales.

### `SelectPopover`

Componente reutilizable que envuelve un trigger (children) y muestra una lista de opciones tipadas. Implementado con `Select` de `@base-ui/react/select` (no con `Popover` — `Select` ya provee la semántica de "elegir un valor de una lista").

```typescript
export interface SelectPopoverProps {
  options: SchemaOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  /** If true, adds a "clear" item that calls onChange(null). */
  allowClear?: boolean;
  /** Label for the clear item. Default: "Sin valor". */
  clearLabel?: string;
  disabled?: boolean;
  /** Visual content of the trigger button (e.g. a chip). */
  children: React.ReactNode;
  /** Optional className for the trigger button. */
  triggerClassName?: string;
}
```

Los colores de cada opción usan los hex del schema de Notion mapeados a tokens del tema vía `getNotionColor` en `constants.ts`.

### Toasts

`services/toastStore.ts` es un mini event emitter sin dependencias externas. API completa:

```typescript
export type ToastVariant = "error" | "info" | "success";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  description?: string;
}

toastStore.show({
  variant: "error" | "info" | "success",
  message: string,
  description?: string,
  autoDismiss?: boolean,   // default true
}): string;                // devuelve el id

toastStore.dismiss(id: string): void;
toastStore.clear(): void;
toastStore.subscribe(listener): () => void;
toastStore.getSnapshot(): Toast[];
```

`components/Toaster.tsx` está montado en `Layout.tsx` y se suscribe al store. Renderiza una queue de toasts con auto-dismiss a **4 segundos** (`AUTO_DISMISS_MS`). Si se pasa `autoDismiss: false` el toast queda hasta que se llame explícitamente a `dismiss(id)`.

La decisión de no traer una librería externa de toasts se justificó por mantener el bundle chico — el código completo del sistema (store + componente) ronda las 100 líneas.

## Manejo de errores

| Caso | Detección | Mensaje al usuario | Acción |
|------|-----------|-------------------|--------|
| 403 falta permiso "Update content" | `NotionPermissionError` | "Tu integración no tiene permisos de escritura. Andá a notion.so/my-integrations → tu integración → Capabilities → marcá 'Update content'." | Rollback + toast |
| 401 token inválido | `NotionApiError.status === 401` | "Token expirado. Reconectá en Settings." | Rollback + toast con link a `/settings` |
| 429 rate limit | `NotionApiError.status === 429` | "Notion está limitando requests. Esperá unos segundos." | Rollback + toast |
| 400 bad request (valor inválido para select/status) | `NotionApiError.status === 400` | "Valor inválido. Tu workspace puede haber cambiado. Recargá la página." | Rollback + toast — sugiere refrescar el schema |
| Network error / timeout del fetch | `TypeError` del fetch | "No se pudo conectar con Notion." | Rollback + toast |
| 500+ server error | `NotionApiError.status >= 500` | "Notion no está respondiendo. Intentá de nuevo en un minuto." | Rollback + toast |
| Mutación colgada (>12s) | `MutationTimeoutError` (timeout local con `Promise.race`) | "La actualización está tardando demasiado. Verificá tu conexión y reintentá." | Rollback + toast + liberar de `pendingMutations` para desbloquear refresh |

Toda esta lógica vive en `handleMutationError()` en `useNotionData.ts`. Cada rama mapea a un toast con `variant: "error"`.

## Estado actual

El feature está implementado, deployado y funcionando. La estructura final coincide con el plan original con las siguientes divergencias documentadas en este spec:

1. **Patrón de slots** en lugar de promesas encadenadas para el coalescing (ver "Coalescing y serialización por slot"). Decisión tomada durante la implementación por simplicidad.
2. **Schema cache sin fallback degradado**: si el fetch del schema falla, las mutaciones se bloquean directamente con un toast en lugar de derivar opciones desde los datos cargados (ver "Schema cache").
3. **`PendingMutation` interface eliminada**: simplificado a `Set<string>` directamente — los timestamps no se usaban en ninguna parte.
4. **`SelectPopover` usa `Select` de base-ui**, no `Popover`. `Select` ya provee la semántica correcta de "elegir un valor de una lista".

Para extender el feature (agregar nuevos campos editables, soportar más tipos de propiedades, etc.) los puntos de entrada son:

- **`services/notion.ts`** — agregar la mutación al fetcher correspondiente y, si requiere resolución dinámica de propiedad, extender `fetchEditableSchema`.
- **`hooks/useNotionData.ts`** — agregar el entry point de mutación (similar a `updateTask` / `updateProject`) que llame a `requestMutation` con la clave única correcta.
- **Componente UI correspondiente** — usar `SelectPopover` o el patrón inline equivalente para disparar la mutación.
