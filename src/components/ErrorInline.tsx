import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorInlineProps {
  message: string;
  onRetry: () => void;
}

export function ErrorInline({ message, onRetry }: ErrorInlineProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 py-8 text-center">
      <AlertCircle className="size-8 text-destructive" strokeWidth={1.5} />
      <p className="max-w-sm text-sm text-text-secondary">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
        <RefreshCw className="size-3.5" />
        Reintentar
      </Button>
    </div>
  );
}
