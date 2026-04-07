export type ToastVariant = "error" | "info" | "success";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  description?: string;
}

type Listener = (toasts: Toast[]) => void;

const AUTO_DISMISS_MS = 4000;

let toasts: Toast[] = [];
const listeners = new Set<Listener>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function emit(): void {
  for (const listener of listeners) listener(toasts);
}

function generateId(): string {
  return `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const toastStore = {
  show(toast: Omit<Toast, "id"> & { autoDismiss?: boolean }): string {
    const id = generateId();
    const { autoDismiss = true, ...rest } = toast;
    toasts = [...toasts, { id, ...rest }];
    emit();

    if (autoDismiss) {
      const timer = setTimeout(() => toastStore.dismiss(id), AUTO_DISMISS_MS);
      timers.set(id, timer);
    }

    return id;
  },

  dismiss(id: string): void {
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  },

  clear(): void {
    for (const timer of timers.values()) clearTimeout(timer);
    timers.clear();
    toasts = [];
    emit();
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    listener(toasts);
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot(): Toast[] {
    return toasts;
  },
};
