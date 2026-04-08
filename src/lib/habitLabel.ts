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
