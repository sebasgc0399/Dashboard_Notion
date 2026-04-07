import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Check, Loader2, ArrowLeft, AlertCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { tokenStore } from "@/services/tokenStore";
import { dbIdsStore } from "@/services/dbIdsStore";
import { resolveDatabaseIds, testConnection } from "@/services/notion";
import type { DbKey } from "@/types";

interface SettingsProps {
  onTokenChange: () => void;
}

type TestStatus = "idle" | "loading" | "success" | "error";
type SlotStatus = "auto" | "ambiguous" | "missing" | "manual" | "empty";

interface DbResolution {
  values: Record<DbKey, string>;
  status: Record<DbKey, SlotStatus>;
}

const DB_LABELS: Record<DbKey, string> = {
  habits: "Hábitos",
  tasks: "Tareas",
  projects: "Proyectos",
};

const DB_KEYS: DbKey[] = ["habits", "tasks", "projects"];

function emptyResolution(): DbResolution {
  return {
    values: { habits: "", tasks: "", projects: "" },
    status: { habits: "empty", tasks: "empty", projects: "empty" },
  };
}

function resolutionFromStore(): DbResolution {
  const saved = dbIdsStore.get() ?? {};
  const res = emptyResolution();
  for (const key of DB_KEYS) {
    if (saved[key]) {
      res.values[key] = saved[key]!;
      res.status[key] = "manual";
    }
  }
  return res;
}

export function Settings({ onTokenChange }: SettingsProps) {
  const navigate = useNavigate();
  const hasToken = tokenStore.exists();

  const [token, setToken] = useState("");
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [dbResolution, setDbResolution] = useState<DbResolution>(() =>
    resolutionFromStore()
  );
  const [showDbPanel, setShowDbPanel] = useState(
    () => hasToken && !dbIdsStore.isComplete()
  );

  // Keep panel/resolution in sync if the token gets cleared elsewhere
  useEffect(() => {
    if (!hasToken) {
      setDbResolution(emptyResolution());
      setShowDbPanel(false);
    }
  }, [hasToken]);

  function applyResolution(result: Awaited<ReturnType<typeof resolveDatabaseIds>>) {
    const next = emptyResolution();
    for (const key of DB_KEYS) {
      const id = result.resolved[key];
      if (id) {
        next.values[key] = id;
        next.status[key] = "auto";
      } else if (result.ambiguous.includes(key)) {
        next.status[key] = "ambiguous";
      } else {
        next.status[key] = "missing";
      }
    }
    setDbResolution(next);
    return next;
  }

  async function handleTest() {
    if (!token.trim()) return;

    setTestStatus("loading");
    setErrorMessage("");

    const previousToken = tokenStore.get();
    tokenStore.set(token.trim());

    try {
      await testConnection();
      setTestStatus("success");
      setTimeout(() => setTestStatus("idle"), 2000);
    } catch (err) {
      if (previousToken) {
        tokenStore.set(previousToken);
      } else {
        tokenStore.clear();
      }
      setTestStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Error de conexión"
      );
    }
  }

  async function handleSave() {
    if (!token.trim()) return;

    setResolving(true);
    setErrorMessage("");
    setTestStatus("idle");

    const previousToken = tokenStore.get();
    tokenStore.set(token.trim());

    try {
      const result = await resolveDatabaseIds();
      const next = applyResolution(result);

      if (
        result.missing.length === 0 &&
        result.ambiguous.length === 0 &&
        DB_KEYS.every((k) => next.values[k])
      ) {
        // Caso A: todo resuelto automáticamente
        dbIdsStore.set({
          habits: next.values.habits,
          tasks: next.values.tasks,
          projects: next.values.projects,
        });
        onTokenChange();
        navigate("/");
        return;
      }

      // Caso B: falta algo o hay ambigüedad → persistir lo que sí se resolvió
      // y mostrar el panel manual.
      const partial: Partial<Record<DbKey, string>> = {};
      for (const key of DB_KEYS) {
        if (next.values[key]) partial[key] = next.values[key];
      }
      dbIdsStore.setPartial(partial);
      onTokenChange();
      setShowDbPanel(true);
    } catch (err) {
      if (previousToken) {
        tokenStore.set(previousToken);
      } else {
        tokenStore.clear();
      }
      setTestStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Error de conexión"
      );
    } finally {
      setResolving(false);
    }
  }

  function handleDbValueChange(key: DbKey, value: string) {
    setDbResolution((prev) => ({
      values: { ...prev.values, [key]: value },
      status: { ...prev.status, [key]: value ? "manual" : "empty" },
    }));
  }

  function handleSaveDbIds() {
    if (!DB_KEYS.every((k) => dbResolution.values[k].trim())) return;
    dbIdsStore.set({
      habits: dbResolution.values.habits.trim(),
      tasks: dbResolution.values.tasks.trim(),
      projects: dbResolution.values.projects.trim(),
    });
    onTokenChange();
    navigate("/");
  }

  function handleDisconnect() {
    tokenStore.clear();
    dbIdsStore.clear();
    onTokenChange();
    setDisconnectOpen(false);
    setToken("");
    setTestStatus("idle");
    setErrorMessage("");
    setDbResolution(emptyResolution());
    setShowDbPanel(false);
    setResolving(false);
  }

  const dbIdsComplete = DB_KEYS.every((k) => dbResolution.values[k].trim());

  return (
    <div className="animate-fade-in mx-auto max-w-lg">
      {/* Back button if has token */}
      {hasToken && (
        <button
          onClick={() => navigate("/")}
          className="mb-6 flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text-secondary"
        >
          <ArrowLeft className="size-4" />
          Volver al dashboard
        </button>
      )}

      <div className="rounded-xl border border-border-subtle bg-bg-card p-6">
        <h2 className="text-lg font-semibold text-text-primary">
          Configuración
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Conectá tu workspace de Notion con un Integration Token.
        </p>

        <div className="mt-6 space-y-4">
          {/* Token input */}
          <div>
            <label
              htmlFor="token"
              className="mb-1.5 block text-xs font-medium text-text-muted"
            >
              Notion Integration Token
            </label>
            <Input
              id="token"
              type="password"
              placeholder={hasToken ? "••••••••••••••••" : "ntn_xxxxxxxxxxxxx"}
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setTestStatus("idle");
                setErrorMessage("");
              }}
              className="border-border-default bg-bg-elevated text-text-primary placeholder:text-text-muted"
            />
          </div>

          {/* Error message */}
          {testStatus === "error" && errorMessage && (
            <p className="text-xs text-destructive">{errorMessage}</p>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={!token.trim() || testStatus === "loading" || resolving}
              className="gap-2"
            >
              {testStatus === "loading" && (
                <Loader2 className="size-3.5 animate-spin" />
              )}
              {testStatus === "success" && (
                <Check className="size-3.5 text-accent" />
              )}
              {testStatus === "success"
                ? "Conexión exitosa"
                : "Probar conexión"}
            </Button>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={!token.trim() || testStatus === "loading" || resolving}
              className="gap-2"
            >
              {resolving && <Loader2 className="size-3.5 animate-spin" />}
              {resolving ? "Resolviendo databases..." : "Guardar"}
            </Button>
          </div>
        </div>

        {/* Manual DB IDs panel */}
        {hasToken && (
          <div className="mt-8 border-t border-border-subtle pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-text-secondary">
                  Databases
                </h3>
                <p className="mt-1 text-xs text-text-muted">
                  IDs de los databases de Notion que la app va a leer.
                </p>
              </div>
              {!showDbPanel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDbPanel(true)}
                >
                  Editar
                </Button>
              )}
            </div>

            {showDbPanel && (
              <div className="mt-4 space-y-3">
                {DB_KEYS.map((key) => (
                  <DbIdInput
                    key={key}
                    dbKey={key}
                    value={dbResolution.values[key]}
                    status={dbResolution.status[key]}
                    onChange={(v) => handleDbValueChange(key, v)}
                  />
                ))}
                <Button
                  size="sm"
                  onClick={handleSaveDbIds}
                  disabled={!dbIdsComplete}
                  className="mt-2"
                >
                  Guardar databases
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Disconnect section */}
        {hasToken && (
          <div className="mt-8 border-t border-border-subtle pt-6">
            <h3 className="text-sm font-medium text-text-secondary">
              Desconectar
            </h3>
            <p className="mt-1 text-xs text-text-muted">
              Esto borra el token almacenado y limpia todos los datos.
            </p>

            <Dialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
              <DialogTrigger
                render={
                  <Button variant="destructive" size="sm" className="mt-3" />
                }
              >
                Desconectar
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>¿Seguro que querés desconectar?</DialogTitle>
                  <DialogDescription>
                    Se borrará tu Notion Integration Token y todos los datos en
                    memoria. Vas a necesitar volver a ingresarlo para usar el
                    dashboard.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDisconnectOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button variant="destructive" onClick={handleDisconnect}>
                    Sí, desconectar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    </div>
  );
}

interface DbIdInputProps {
  dbKey: DbKey;
  value: string;
  status: SlotStatus;
  onChange: (value: string) => void;
}

function DbIdInput({ dbKey, value, status, onChange }: DbIdInputProps) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label
          htmlFor={`db-${dbKey}`}
          className="text-xs font-medium text-text-muted"
        >
          {DB_LABELS[dbKey]}
        </label>
        <StatusChip status={status} />
      </div>
      <Input
        id={`db-${dbKey}`}
        type="text"
        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-border-default bg-bg-elevated text-text-primary placeholder:text-text-muted font-mono text-xs"
      />
    </div>
  );
}

function StatusChip({ status }: { status: SlotStatus }) {
  switch (status) {
    case "auto":
      return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400">
          <Check className="size-3" /> Resuelto
        </span>
      );
    case "ambiguous":
      return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400">
          <AlertTriangle className="size-3" /> Ambiguo
        </span>
      );
    case "missing":
      return (
        <span className="flex items-center gap-1 text-[10px] font-medium text-rose-400">
          <AlertCircle className="size-3" /> No encontrado
        </span>
      );
    case "manual":
      return (
        <span className="text-[10px] font-medium text-text-muted">Manual</span>
      );
    default:
      return null;
  }
}
