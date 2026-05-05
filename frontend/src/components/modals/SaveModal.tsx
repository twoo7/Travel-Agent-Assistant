"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, X } from "lucide-react";
import { api } from "@/services/api";
import { useTripContext } from "@/context/TripContext";
import { Button } from "@/components/ui/Button";

interface SaveModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function SaveModal({ open, onClose, onSaved }: SaveModalProps) {
  const { state, dispatch } = useTripContext();
  const { activeTripId, tripName } = state;

  const [nameInput, setNameInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (open) {
      setNameInput(tripName ?? "");
      setSaveError("");
    }
  }, [open, tripName]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError("");
    const name = nameInput.trim() || null;
    try {
      let tripId = activeTripId;
      let savedOk = false;

      if (tripId) {
        try {
          if (name) await api.renameTrip(tripId, name);
          await api.saveTrip(tripId, state);
          savedOk = true;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "";
          if (msg.includes("403")) {
            dispatch({ type: "SET_ACTIVE_TRIP_ID", payload: null });
            tripId = null;
          } else {
            throw err;
          }
        }
      }

      if (!savedOk) {
        const { trip_id } = await api.createTrip(name, state);
        dispatch({ type: "SET_ACTIVE_TRIP_ID", payload: trip_id });
      }

      if (name) dispatch({ type: "SET_TRIP_NAME", payload: name });
      onClose();
      onSaved?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed. Is the backend running?";
      setSaveError(msg);
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }, [activeTripId, nameInput, state, dispatch, onClose, onSaved]);

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
              Save Trip
            </p>
            <h2 className="font-display text-xl font-medium mb-4 text-ink">
              {tripName ? "Update trip name" : "Name your trip"}
            </h2>

            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              placeholder="e.g. Tokyo Summer 2026"
              className="w-full px-3 py-2.5 text-sm font-body rounded border border-border bg-surface text-ink placeholder:text-ink-subtle focus:outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 mb-4"
              autoFocus
            />

            {saveError && (
              <p className="text-xs rounded px-3 py-2 mb-3 font-body text-red bg-red/8 border border-red/20">
                {saveError}
              </p>
            )}

            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} fullWidth>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                loading={saving}
                icon={<Save size={13} />}
                fullWidth
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
