import * as React from "react";
import { cn } from "../../lib/utils";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const variantStyles: Record<ToastVariant, string> = {
  success: "bg-green-50 border-green-200 text-green-800",
  error: "bg-red-50 border-red-200 text-red-800",
  warning: "bg-amber-50 border-amber-200 text-amber-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
};

const variantIcons: Record<ToastVariant, string> = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [isExiting, setIsExiting] = React.useState(false);

  React.useEffect(() => {
    const duration = toast.duration || 5000;
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onDismiss(toast.id), 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onDismiss]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg transition-all duration-300 ease-in-out min-w-[320px] max-w-[420px]",
        variantStyles[toast.variant],
        isExiting
          ? "opacity-0 translate-x-full"
          : "opacity-100 translate-x-0"
      )}
    >
      <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-white bg-opacity-50 text-sm font-bold">
        {variantIcons[toast.variant]}
      </div>
      <div className="flex-1 text-sm font-medium leading-relaxed">
        {toast.message}
      </div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 rounded-md p-1 hover:bg-white hover:bg-opacity-30 transition-colors"
        aria-label="Dismiss notification"
      >
        <span className="text-base leading-none">×</span>
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      <div className="flex flex-col gap-3 pointer-events-auto">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </div>
    </div>
  );
}
