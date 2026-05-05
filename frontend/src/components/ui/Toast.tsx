"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, AlertCircle, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  onUndo?: () => void;
  undoLabel?: string;
}

interface ToastOptions {
  variant?: ToastVariant;
  onUndo?: () => void;
  undoLabel?: string;
  durationMs?: number;
}

interface ToastContextValue {
  toast: (message: string, variantOrOptions?: ToastVariant | ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const variantConfig: Record<
  ToastVariant,
  { icon: React.ReactNode; bgClass: string }
> = {
  success: { icon: <Check size={16} />, bgClass: "bg-teal text-surface" },
  error: { icon: <AlertCircle size={16} />, bgClass: "bg-red text-surface" },
  info: { icon: <Info size={16} />, bgClass: "bg-surface border border-border text-ink" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
  }, []);

  const toast = useCallback((
    message: string,
    variantOrOptions: ToastVariant | ToastOptions = "info"
  ) => {
    const options: ToastOptions =
      typeof variantOrOptions === "string"
        ? { variant: variantOrOptions }
        : variantOrOptions;

    const { variant = "info", onUndo, undoLabel = "Undo", durationMs = onUndo ? 8000 : 4000 } = options;

    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, variant, onUndo, undoLabel }]);
    const timer = setTimeout(() => dismiss(id), durationMs);
    timers.current.set(id, timer);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => {
            const { icon, bgClass } = variantConfig[t.variant];
            const hasUndo = !!t.onUndo;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={[
                  "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-md",
                  "text-sm font-body font-medium max-w-xs",
                  hasUndo ? "bg-surface border border-border text-ink" : bgClass,
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {!hasUndo && <span className="shrink-0">{icon}</span>}
                <span className="flex-1">{t.message}</span>
                {hasUndo && (
                  <button
                    onClick={() => { t.onUndo?.(); dismiss(t.id); }}
                    className="shrink-0 text-xs font-semibold px-2 py-1 rounded-lg transition-colors font-body text-teal bg-teal-light"
                  >
                    {t.undoLabel}
                  </button>
                )}
                <button
                  onClick={() => dismiss(t.id)}
                  className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
                  aria-label="Dismiss"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
