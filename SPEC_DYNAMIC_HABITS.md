# SPEC — Hábitos dinámicos

> Feature spec para que el dashboard descubra la lista de hábitos directamente desde el database de Notion, en vez de tenerla hardcodeada en código. Hoy agregar, quitar, renombrar o reordenar un checkbox en Notion rompe el dashboard silenciosamente; este documento define cómo cerrar ese gap manteniendo el código lo más simple posible.

## Contexto

El dashboard trata a los hábitos como una lista cerrada de 14 items, definida literalmente en [src/constants.ts:1-16](src/constants.ts#L1-L16) como `HABITS_LIST`. Esa constante es la fuente de verdad en cinco lugares:

1. **Resolver del DB** — [src/services/notion.ts:153-159](src/services/notion.ts#L153-L159) exige que al menos 3 checkboxes del database coincidan exactamente (por nombre) con `HABITS_LIST` para reconocerlo como "Hábitos".
2. **Fetcher** — [src/services/notion.ts:271-289](src/services/notion.ts#L271-L289) solo lee los checkboxes cuyo nombre está en `HABITS_LIST`, e ignora el resto. El `pct` se calcula con `HABITS_LIST.length` como denominador fijo.
3. **Heatmap** — [src/components/HabitHeatmap.tsx:96](src/components/HabitHeatmap.tsx#L96) renderiza las filas iterando `HABITS_LIST`.
4. **Consistencia** — [src/hooks/useNotionData.ts:556-569](src/hooks/useNotionData.ts#L556-L569) arma `habitFreq` iterando `HABITS_LIST` y toma los labels cortos de `HABIT_ABBREVIATIONS`.
5. **Update optimista** — [src/hooks/useNotionData.ts:404](src/hooks/useNotionData.ts#L404) recalcula el `pct` usando `HABITS_LIST.length` como denominador.

El problema: cualquier cambio en la estructura de hábitos en Notion rompe una o más de estas piezas sin que el usuario se entere.

| Cambio en Notion | Efecto en el dashboard actual |
|---|---|
| Agregar un checkbox nuevo | Se ignora completamente. No aparece en el heatmap, no cuenta para la consistencia, no afecta el `pct`. |
| Quitar un checkbox | Sigue apareciendo en el heatmap como "no completado" todos los días. Baja el `pct` artificialmente. Si quedan <3 con los nombres originales, el resolver puede dejar de matchear el DB entero. |
| Renombrar un checkbox | Se trata como hábito nuevo (ignorado) y el anterior queda siempre vacío. |
| Reordenar columnas en Notion | El heatmap sigue en el orden hardcodeado de `HABITS_LIST`. |

El objetivo de esta feature es eliminar ese acoplamiento: el dashboard debe descubrir los hábitos **en runtime**, desde el schema del database de Notion.

## Objetivos

- **Descubrimiento dinámico**: la lista de hábitos viene del schema del database, no del código.
- **Cantidad dinámica**: el `pct` de cada día se calcula sobre la cantidad real de hábitos del DB, no sobre 14.
- **Orden dinámico**: el orden visual del heatmap refleja el orden de las columnas en Notion.
- **Tolerancia a renombres**: si el usuario renombra un checkbox, el dashboard sigue funcionando en el próximo refresh.
- **Cero configuración extra**: no hay UI de settings nueva ni estado persistente extra. La única "configuración" es editar los checkboxes en Notion.

## No-Objetivos (explícitamente fuera del alcance)

- Crear días de hábitos nuevos desde el dashboard (ya estaba fuera de alcance en el feature anterior).
- Editar la estructura del DB (agregar/quitar/renombrar checkboxes) desde la UI del dashboard.
- UI de configuración en Settings para mapear o excluir hábitos individualmente.
- i18n o diccionario de abreviaturas "bonitas" para los nombres de hábitos del template base. Se reemplazan por truncate automático.
- Preservar historial visual cuando un hábito es renombrado en Notion (el renombrado se trata como removed + added).
- Detección en tiempo real de cambios hechos en Notion mientras el dashboard está abierto — sigue habiendo refresh manual.

## Decisiones tomadas

Estas decisiones ya están confirmadas con el usuario y son la base del diseño:

| Decisión | Elegido | Razón |
|----------|---------|-------|
| Cómo identificar los hábitos | **Todos los checkboxes del DB**, con una blacklist hardcodeada mínima (`["Archive"]`) para excluir utilitarios conocidos | Cero convenciones en Notion. Agregar un checkbox nuevo en Notion = hábito nuevo en el dashboard, sin tocar código. Si un día hace falta excluir otro, se agrega al array local y se redesplega. |
| Orden en el heatmap y el chart | **El orden que devuelve Notion** en `properties` (coincide con el orden visual del DB) | El usuario controla el orden reordenando columnas en Notion. V8 preserva el orden de inserción de keys en objetos, y la Notion API emite `properties` en el orden del DB, así que `Object.entries(properties)` basta. |
| `HABITS_LIST` y `HABIT_ABBREVIATIONS` como constantes | **Eliminar ambas** | Limpieza total. Las abreviaturas se calculan con un helper de truncate automático. Trade-off: algunas abreviaturas "bonitas" del template base (ej. "NoDulce" para "No comer dulce") se pierden. Aceptado. |
| Dónde vive la blacklist | **Constante local en `services/notion.ts`** con un comentario explicativo, no en `constants.ts` ni en Settings | Es un detalle de implementación del fetcher, no una config de usuario. Si hace falta extenderla, se edita un solo lugar. |
| Schema fetch extra | **Sí — `GET databases/{id}` como primer paso de `fetchHabits`** | Es la única forma de conocer los hábitos cuando el DB está vacío o tiene pocos días. El costo (1 request extra por refresh de hábitos) es marginal. |

## Alcance del feature

| Área | Cambio | Notas |
|------|--------|-------|
| `services/notion.ts` — `fetchHabits` | Devuelve ahora `{ habits, habitNames }` en vez de solo `habits` | `habitNames` se deriva del schema del database. |
| `services/notion.ts` — `schemaMatches` para `habits` | Se relaja: ya no depende de `HABITS_LIST`. Basta con una prop `Date` + ≥1 checkbox fuera de la blacklist. | El resolver sigue siendo robusto aunque el usuario renombre todos los hábitos. |
| `hooks/useNotionData.ts` | Nuevo estado `habitNames`. `habitFreq` y `updateHabit` dejan de usar `HABITS_LIST`. | `habitNames` se propaga al `NotionData`. |
| `components/HabitHeatmap.tsx` | Recibe `habitNames` como prop. Itera esa lista en vez de `HABITS_LIST`. | Empty state específico cuando `habitNames.length === 0`. |
| `pages/Habits.tsx` + `App.tsx` | Propagación de la nueva prop. | Sin lógica nueva. |
| `lib/habitLabel.ts` (nuevo) | Helper `habitAbbreviation(name)` para labels cortos del chart. | Reemplaza `HABIT_ABBREVIATIONS`. |
| `constants.ts` | **Borrar** `HABITS_LIST` y `HABIT_ABBREVIATIONS`. | El resto de constantes se mantiene. |

**Fuera del alcance de los cambios:**

- Tasks y Projects ya son dinámicos vía `fetchTasksSchema` / `fetchProjectsSchema`. No se toca nada de ese código.
- El proxy ([functions/src/index.ts](functions/src/index.ts)) ya permite `GET databases/{id}` (se habilitó en `SPEC_INTERACTIVE_EDITS.md`). No requiere cambios de backend.

## Diseño

### Tipo nuevo: `HabitsData`

`fetchHabits` pasa a devolver un contenedor con ambas cosas:

```typescript
export interface HabitsData {
  habits: HabitDay[];      // lo mismo que devuelve hoy fetchHabits
  habitNames: string[];    // orden del DB, ya filtrado contra la blacklist
}
```

`habitNames` vive en el contenedor, no dentro de cada `HabitDay`, porque es información cross-day (no cambia día a día dentro de un mismo fetch).

### Cambios en `services/notion.ts`

```typescript
// Propiedades checkbox que nunca son hábitos. Extender si hace falta.
const HABITS_PROP_BLACKLIST = new Set<string>(["Archive"]);

function extractHabitNames(properties: Record<string, any>): string[] {
  const names: string[] = [];
  for (const [name, def] of Object.entries(properties)) {
    if (def?.type !== "checkbox") continue;
    if (HABITS_PROP_BLACKLIST.has(name)) continue;
    names.push(name);
  }
  return names;
}

export async function fetchHabits(): Promise<HabitsData> {
  const dbId = requireDbId("habits");

  // 1) Schema fetch — necesario para conocer habitNames incluso si el DB está vacío
  const dbRes = await callProxy(`databases/${dbId}`, { method: "GET" });
  const habitNames = extractHabitNames(dbRes.properties ?? {});

  // 2) Query de los últimos 30 días — igual que hoy
  const res = await queryNotion(dbId, {
    page_size: 30,
    sorts: [{ property: "Date", direction: "descending" }],
  });

  const totalHabits = habitNames.length;

  const habits = res.results
    .map((result: any): HabitDay | null => {
      const date = result.properties.Date?.date?.start;
      if (!date) return null;

      const completed = habitNames.filter(
        (h) => result.properties[h]?.checkbox === true
      );

      return {
        id: result.id,
        date,
        completed,
        pct: totalHabits === 0
          ? 0
          : Math.round((completed.length / totalHabits) * 100),
      };
    })
    .filter((item: HabitDay | null): item is HabitDay => item !== null);

  return { habits, habitNames };
}
```

### Resolver de DB relajado

```typescript
function schemaMatches(db: any, key: DbKey): boolean {
  const props = db?.properties;
  if (!props || typeof props !== "object") return false;

  if (key === "habits") {
    // Necesita una propiedad Date y al menos un checkbox fuera de la blacklist
    if (props.Date?.type !== "date") return false;
    const habitNames = extractHabitNames(props);
    return habitNames.length >= 1;
  }

  return REQUIRED_PROPS[key].every(({ name, type }) => {
    const p = props[name];
    return p && p.type === type;
  });
}
```

Notar que se sigue exigiendo la prop `Date` con ese nombre literal. Eso es coherente con la regla establecida en `SPEC_INTERACTIVE_EDITS.md` ("solo resolvemos por tipo lo que editamos"): `Date` es solo lectura, así que queda como literal.

### Helper de abreviaturas

Nuevo archivo [src/lib/habitLabel.ts](src/lib/habitLabel.ts):

```typescript
/**
 * Genera una abreviatura corta para un nombre de hábito, pensada para ejes
 * de gráficos donde el espacio horizontal es limitado.
 *
 * Reglas:
 * - Si el nombre ya es corto (≤ maxLen chars), se devuelve tal cual.
 * - Si tiene espacios:
 *     - Se intenta armar la abreviatura con las primeras N palabras mientras
 *       quepan en maxLen (separadas por espacio). Esto evita que nombres con
 *       una primera palabra muy corta (ej. "No comer dulce") queden como "No."
 *       y prioriza mostrar contexto ("No com.").
 *     - Si solo entra la primera palabra completa, se agrega "." al final.
 *     - Si ni siquiera la primera palabra entera entra, se trunca a maxLen-1 + ".".
 * - Si no tiene espacios, se trunca a maxLen-1 y se agrega "." al final.
 *
 * Ejemplos (maxLen = 7):
 *   "Ejercicio"          → "Ejerci."
 *   "Codear"             → "Codear"
 *   "Comer bien"         → "Comer."
 *   "Planificar el día"  → "Planif."
 *   "No comer dulce"     → "No com."
 *   "Tomar agua"         → "Tomar."
 *   "Tiempo con pareja"  → "Tiempo."
 */
export function habitAbbreviation(name: string, maxLen = 7): string {
  if (name.length <= maxLen) return name;

  if (name.includes(" ")) {
    const words = name.split(/\s+/).filter(Boolean);
    const first = words[0];

    // La primera palabra no entra ni siquiera sola → truncate duro.
    if (first.length > maxLen) {
      return `${first.slice(0, maxLen - 1)}.`;
    }

    // Tratamos de acumular palabras enteras mientras entren (dejando lugar al ".").
    // El "." al final siempre ocupa 1 char, así que el presupuesto útil es maxLen-1.
    let acc = first;
    for (let i = 1; i < words.length; i++) {
      const candidate = `${acc} ${words[i]}`;
      if (candidate.length <= maxLen - 1) {
        acc = candidate;
        continue;
      }
      // La palabra entera no entra — probamos truncarla si al menos caben
      // 2 chars útiles de ella (evita cosas como "No c." que son ruido).
      const remaining = maxLen - 1 - (acc.length + 1); // -1 por el "."; -1 por el espacio
      if (remaining >= 2) {
        acc = `${acc} ${words[i].slice(0, remaining)}`;
      }
      break;
    }
    return `${acc}.`;
  }

  return `${name.slice(0, maxLen - 1)}.`;
}
```

**Trade-off asumido**: este helper no preserva las abreviaturas "bonitas" del template (ej. "NoDulce" para "No comer dulce"). El usuario aceptó esta pérdida a cambio de eliminar por completo el lookup hardcodeado. Si más adelante molesta, se puede agregar un override opcional en `constants.ts`, pero queda fuera del alcance de este spec.

### Cambios en `types/index.ts`

```typescript
// Nuevo
export interface HabitsData {
  habits: HabitDay[];
  habitNames: string[];
}

// NotionData se extiende con:
export interface NotionData {
  // ... campos existentes
  habitNames: string[];
}
```

### Cambios en `hooks/useNotionData.ts`

1. Nuevo estado:
   ```typescript
   const [habitNames, setHabitNames] = useState<string[]>([]);
   ```

2. `loadHabits` destructura el retorno nuevo:
   ```typescript
   const { habits, habitNames } = await fetchHabits();
   setHabits(habits);
   setHabitNames(habitNames);
   ```

3. `updateHabit` — [src/hooks/useNotionData.ts:404](src/hooks/useNotionData.ts#L404) — cambia el denominador:
   ```typescript
   pct: habitNames.length === 0
     ? 0
     : Math.round((completed.length / habitNames.length) * 100),
   ```
   La dependencia del `useCallback` suma `habitNames`.

4. `habitFreq` — [src/hooks/useNotionData.ts:556-569](src/hooks/useNotionData.ts#L556-L569) — itera `habitNames` y usa el helper:
   ```typescript
   const habitFreq = useMemo<HabitFreq[]>(() => {
     if (!habits || habits.length === 0 || habitNames.length === 0) return [];
     const totalDays = habits.length;
     return habitNames.map((habit) => {
       const count = habits.filter((day) => day.completed.includes(habit)).length;
       return {
         name: habitAbbreviation(habit),
         full: habit,
         pct: Math.round((count / totalDays) * 100),
       };
     });
   }, [habits, habitNames]);
   ```

5. `habitNames` se expone en el objeto de retorno del hook.

### Cambios en `components/HabitHeatmap.tsx`

- Nueva prop: `habitNames: string[]`.
- Quitar `import { HABITS_LIST } from "@/constants"`.
- Reemplazar `HABITS_LIST.map(...)` por `habitNames.map(...)` en [src/components/HabitHeatmap.tsx:96](src/components/HabitHeatmap.tsx#L96).
- Al comienzo del render, si `habitNames.length === 0`, devolver un empty state inline:
  ```tsx
  if (habitNames.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        No hay hábitos configurados en tu database de Notion. Agregá propiedades
        de tipo checkbox al database para que aparezcan acá.
      </p>
    );
  }
  ```
  Nota: este empty state es distinto del empty state general de `Habits.tsx` que se dispara cuando no hay días registrados.

### Cambios en `pages/Habits.tsx` y `App.tsx`

- `Habits.tsx`: nueva prop `habitNames`, pasada al `HabitHeatmap`.
- `App.tsx`: destructurar `habitNames` del hook y pasarlo al `<Habits />`.

No hay cambios en `HabitConsistencyChart` — sigue recibiendo `HabitFreq[]` ya armado.

### Limpieza final en `constants.ts`

- **Eliminar** `HABITS_LIST` (líneas 1-16).
- **Eliminar** `HABIT_ABBREVIATIONS` (líneas 85-100).
- Mantener `CHART_COLORS`, `STATUS_COLORS`, `PRIORITY_COLORS`, `NOTION_COLOR_MAP`, `getNotionColor`.
- Después de borrar, `grep -rn "HABITS_LIST\|HABIT_ABBREVIATIONS" src/` no debe devolver nada.

## Manejo de edge cases

| Caso | Comportamiento |
|------|---------------|
| DB con 14 checkboxes (caso base) | Idéntico al actual, ahora descubierto dinámicamente. |
| Agregar checkbox "Journaling" en Notion | Aparece en el próximo refresh, en el heatmap y en el chart. Las páginas históricas no tienen esa prop → aparecen como "no completado" esos días. Aceptado. |
| Quitar un checkbox en Notion | Desaparece del heatmap y del chart en el próximo refresh. Las páginas históricas pueden seguir teniendo la prop en Notion; la ignoramos. El `pct` histórico se recalcula sobre el nuevo total (puede subir artificialmente — es trade-off conocido). |
| Renombrar un checkbox | Se trata como "removido + agregado". La data histórica del nombre viejo se pierde visualmente. Aceptado — trackear history de renombres está explícitamente fuera del alcance. |
| Reordenar columnas en Notion | El orden del heatmap refleja el nuevo orden en el próximo refresh. |
| DB con páginas pero 0 checkboxes (solo Date) | `habitNames: []`, `habits: []` (cada página tendría pct = 0, pero filtramos si totalHabits = 0). El heatmap muestra el empty state específico de "sin hábitos configurados". |
| DB vacío (0 páginas) pero con checkboxes | `habits: []`, `habitNames: [...]`. `Habits.tsx` muestra su empty state habitual de "No hay registros en los últimos 30 días". |
| DB con solo un checkbox "Archive" | `habitNames: []` (filtrado por blacklist). Mismo empty state que el caso anterior. |
| Checkbox legítimamente llamado "Archive" (pero que el usuario quiere trackear como hábito) | Caso patológico, se maneja cambiándole el nombre en Notion. Documentado en este spec como limitación conocida. |
| Blacklist incompleta: aparece un checkbox utilitario como hábito | El usuario puede agregarlo a `HABITS_PROP_BLACKLIST` en el código y redesplegar. |
| Check rápido de un hábito con optimistic update | El `pct` optimista usa `habitNames.length` actual, no 14. Si el número cambió desde el último fetch (poco probable dentro de una sesión), el siguiente refresh reconcilia. |

## Restricciones técnicas

### Orden de `Object.entries`

V8 preserva el orden de inserción de keys string en objetos. La Notion API serializa `properties` en el orden visual del database. Esta cadena de garantías es **load-bearing** para esta feature: el orden del heatmap depende de ella.

No es un riesgo nuevo — `fetchEditableSchema` en [src/services/notion.ts:338-346](src/services/notion.ts#L338-L346) ya usa `Object.entries` con `findPropByType` asumiendo ese orden. Este spec se alinea con esa convención.

### Un request adicional por refresh de hábitos

`fetchHabits` pasa de 1 call (`POST databases/{id}/query`) a 2 (`GET databases/{id}` + `POST databases/{id}/query`). Costo marginal:

- Ocurre solo en el fetch inicial y en cada click del botón refresh.
- El rate limit de Notion (3 req/seg) absorbe esto sin problemas — los tres loaders (habits, tasks, projects) corren en paralelo y ninguno hace más de 2 requests.
- No se optimiza leyendo el schema desde la primera página devuelta por `query` porque agregaría una rama condicional (DB vacío → fallback a GET) que no vale la pena.

### Compatibilidad con el feature de "Interactive Edits"

El spec anterior (`SPEC_INTERACTIVE_EDITS.md`) dejó `updateHabitCheckbox` usando `habitName` directamente como nombre de propiedad en el PATCH. Eso sigue funcionando: los nombres que `HabitHeatmap` le pasa al `updateHabit` del hook ahora vienen de `habitNames` (runtime), no de `HABITS_LIST` (build time), pero siguen siendo los nombres reales de las properties del DB — que es exactamente lo que Notion espera.

Cero cambios en las mutaciones de hábitos.

## Plan de Implementación

### Fase 1 — Tipos
- [ ] Agregar `HabitsData` a [src/types/index.ts](src/types/index.ts).
- [ ] Agregar `habitNames: string[]` a `NotionData`.

### Fase 2 — Servicio
- [ ] Agregar `HABITS_PROP_BLACKLIST` y `extractHabitNames` locales en [src/services/notion.ts](src/services/notion.ts).
- [ ] Reescribir `fetchHabits` para devolver `HabitsData` (schema fetch + query + build).
- [ ] Relajar `schemaMatches(db, "habits")` para que use `extractHabitNames` en vez de `HABITS_LIST`.

### Fase 3 — Helper
- [ ] Crear [src/lib/habitLabel.ts](src/lib/habitLabel.ts) con `habitAbbreviation`.

### Fase 4 — Hook
- [ ] Extender [src/hooks/useNotionData.ts](src/hooks/useNotionData.ts):
  - Nuevo state `habitNames`.
  - `loadHabits` destructura y setea ambos.
  - `updateHabit` usa `habitNames.length` como denominador (y suma `habitNames` a las deps del useCallback).
  - `habitFreq` itera `habitNames` y usa `habitAbbreviation`.
  - Expone `habitNames` en el retorno.

### Fase 5 — UI
- [ ] [src/components/HabitHeatmap.tsx](src/components/HabitHeatmap.tsx): nueva prop, empty state, quitar import de constantes, iterar `habitNames`.
- [ ] [src/pages/Habits.tsx](src/pages/Habits.tsx): propagar `habitNames` al heatmap.
- [ ] [src/App.tsx](src/App.tsx): destructurar del hook y pasar a `<Habits />`.

### Fase 6 — Limpieza
- [ ] Borrar `HABITS_LIST` y `HABIT_ABBREVIATIONS` de [src/constants.ts](src/constants.ts).
- [ ] Verificar que no queden imports huérfanos: `grep -rn "HABITS_LIST\|HABIT_ABBREVIATIONS" src/` debe devolver vacío.
- [ ] `npm run build` debe pasar sin errores de TS.

### Fase 7 — Verificación end-to-end

Pruebas manuales en Notion + dashboard local:

- [ ] **Caso base**: dashboard funciona con los 14 hábitos del template actual.
- [ ] **Agregar**: crear un checkbox "Journaling" en el DB de Hábitos → refresh → aparece en el heatmap y en el chart de consistencia, sin deploy.
- [ ] **Quitar**: eliminar "Gratitud" del DB → refresh → desaparece del heatmap y del chart; el `pct` de los días se recalcula sobre 13 (o el total nuevo) en vez de 14.
- [ ] **Renombrar**: renombrar "Ejercicio" → "Gym" → refresh → aparece como "Gym" en el heatmap; los días viejos muestran "Gym" como no completado (no tenían esa prop). Aceptado.
- [ ] **Reordenar**: mover "Leer" al primer lugar en el DB → refresh → el heatmap muestra "Leer" en la primera fila.
- [ ] **DB con páginas pero sin checkboxes**: temporalmente quitar todos los checkboxes del DB (dejar solo Date) → refresh → empty state "No hay hábitos configurados en tu database de Notion".
- [ ] **DB con solo "Archive"**: agregar un checkbox "Archive" como única prop checkbox → refresh → mismo empty state (blacklist lo filtra).
- [ ] **DB vacío**: archivar todas las páginas del DB pero dejar los checkboxes → refresh → empty state habitual de "No hay registros en los últimos 30 días", la lista de hábitos visible no aplica acá porque `habits.length === 0`.
- [ ] **Optimistic update con nuevo total**: con 15 hábitos en el DB, togglear uno → el `pct` de ese día se actualiza usando `/15`, no `/14`.
- [ ] **Mutación + edit (regresión del feature anterior)**: togglear un hábito → se persiste en Notion correctamente. Verifica que la integración entre `SPEC_INTERACTIVE_EDITS` y este feature sigue funcionando.

### Fase 8 — Deploy
- [ ] `npm run build` exitoso.
- [ ] `firebase deploy --only hosting` (no hay cambios en functions).
- [ ] Smoke test en producción con la cuenta personal — repetir los casos 1-3 de la verificación.
- [ ] Actualizar [README.md](README.md) con una nota breve: "El dashboard descubre los hábitos automáticamente desde los checkboxes de tu database de Notion. Para agregar, quitar o reordenar hábitos, editá el database directamente."

## Archivos a modificar / crear

**Modificar:**
- [src/constants.ts](src/constants.ts) — eliminar `HABITS_LIST` y `HABIT_ABBREVIATIONS`.
- [src/services/notion.ts](src/services/notion.ts) — `fetchHabits` nueva firma + blacklist + `schemaMatches` relajado.
- [src/types/index.ts](src/types/index.ts) — `HabitsData`, `NotionData.habitNames`.
- [src/hooks/useNotionData.ts](src/hooks/useNotionData.ts) — estado, `habitFreq`, `updateHabit`.
- [src/components/HabitHeatmap.tsx](src/components/HabitHeatmap.tsx) — prop + empty state + quitar import.
- [src/pages/Habits.tsx](src/pages/Habits.tsx) — propagar prop.
- [src/App.tsx](src/App.tsx) — propagar prop.
- [README.md](README.md) — nota breve sobre el nuevo comportamiento dinámico.

**Crear:**
- [src/lib/habitLabel.ts](src/lib/habitLabel.ts) — helper `habitAbbreviation`.

## Decisiones abiertas

- **¿Empty state del heatmap cuando `habitNames.length === 0` debería linkear a algún lado?** Propuesta: solo mensaje descriptivo, sin link. Settings no ayuda (hay que editar el database en Notion, no la app). El README puede linkear la documentación del template si hace falta.
- **¿Vale la pena un override opcional para abreviaturas "bonitas"?** No por ahora — el truncate automático es suficiente. Si molesta visualmente después de usarlo, se evalúa como follow-up.
