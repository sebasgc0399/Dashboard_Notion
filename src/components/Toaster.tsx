import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";
import { toastStore, type Toast } from "@/services/toastStore";
import { cn } from "@/lib/utils";

const VARIANT_STYLES: Record<
  Toast["variant"],
  { icon: typeof AlertCircle; container: string; iconColor: string }
> = {
  error: {
    icon: AlertCircle,
    container: "border-rose-500/30 bg-rose-500/10",
    iconColor: "text-rose-400",
  },
  info: {
    icon: Info,
    container: "border-blue-500/30 bg-blue-500/10",
    iconColor: "text-blue-400",
  },
  success: {
    icon: CheckCircle,
    container: "border-emerald-500/30 bg-emerald-500/10",
    iconColor: "text-emerald-400",
  },
};

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>(() => toastStore.getSnapshot());

  useEffect(() => {
    return toastStore.subscribe(setToasts);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:left-auto sm:right-4 sm:items-end"
      aria-label="Notificaciones"
    >
      {toasts.map((toast) => {
        const variant = VARIANT_STYLES[toast.variant];
        const Icon = variant.icon;
        return (
          <div
            key={toast.id}
            className={cn(
              "animate-fade-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border p-3 shadow-lg backdrop-blur-sm",
              variant.container
            )}
            role={toast.variant === "error" ? "alert" : "status"}
          >
            <Icon className={cn("mt-0.5 size-4 shrink-0", variant.iconColor)} />
            <div className="flex-1 text-sm">
              <p className="font-medium text-text-primary">{toast.message}</p>
              {toast.description && (
                <p className="mt-0.5 text-xs text-text-secondary">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              onClick={() => toastStore.dismiss(toast.id)}
              className="text-text-muted transition-colors hover:text-text-primary"
              aria-label="Cerrar notificación"
            >
              <X className="size-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
