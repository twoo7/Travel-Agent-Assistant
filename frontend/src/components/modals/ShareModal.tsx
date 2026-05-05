"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  shareUrl: string;
}

export function ShareModal({ open, onClose, shareUrl }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", shareUrl);
    }
  }, [shareUrl]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40"
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed z-50 left-1/2 -translate-x-1/2 top-20 w-full max-w-sm bg-surface border border-border rounded-xl p-6 shadow-lg"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded text-ink-subtle hover:text-ink hover:bg-surface2 transition-colors"
            >
              <X size={16} />
            </button>

            <p className="text-[10px] font-semibold uppercase tracking-[2px] mb-1.5 font-body text-teal">
              Share Trip
            </p>
            <h2 className="font-display text-xl font-medium mb-4 text-ink">
              Share your itinerary
            </h2>

            <div className="flex gap-2 items-center bg-surface2 border border-border rounded px-3 py-2.5 mb-4">
              <span className="flex-1 text-sm font-body text-ink-muted truncate">{shareUrl}</span>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} fullWidth>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCopy}
                icon={copied ? <Check size={13} /> : <Copy size={13} />}
                fullWidth
              >
                {copied ? "Copied!" : "Copy link"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
