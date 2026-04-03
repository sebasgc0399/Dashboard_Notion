import { useState } from "react";
import { useNavigate } from "react-router";
import { Check, Loader2, ArrowLeft } from "lucide-react";
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
import { testConnection } from "@/services/notion";

interface SettingsProps {
  onTokenChange: () => void;
}

type TestStatus = "idle" | "loading" | "success" | "error";

export function Settings({ onTokenChange }: SettingsProps) {
  const navigate = useNavigate();
  const hasToken = tokenStore.exists();

  const [token, setToken] = useState("");
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  async function handleTest() {
    if (!token.trim()) return;

    setTestStatus("loading");
    setErrorMessage("");

    // Temporarily set the token so testConnection can use it
    const previousToken = tokenStore.get();
    tokenStore.set(token.trim());

    try {
      await testConnection();
      setTestStatus("success");
      setTimeout(() => setTestStatus("idle"), 2000);
    } catch (err) {
      // Restore previous token on failure
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

  function handleSave() {
    if (!token.trim()) return;
    tokenStore.set(token.trim());
    onTokenChange();
    navigate("/");
  }

  function handleDisconnect() {
    tokenStore.clear();
    onTokenChange();
    setDisconnectOpen(false);
    setToken("");
    setTestStatus("idle");
    setErrorMessage("");
  }

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
              disabled={!token.trim() || testStatus === "loading"}
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
              disabled={!token.trim() || testStatus === "loading"}
            >
              Guardar
            </Button>
          </div>
        </div>

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
