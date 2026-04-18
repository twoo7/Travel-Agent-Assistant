"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Share2, X, Check } from "lucide-react";
import { api } from "@/services/api";
import { useTripContext } from "@/context/TripContext";
import { Button } from "@/components/ui/Button";

/**
 * SaveTripButton — header pill showing "Current: <name|Draft> · Save · Share"
 * Only renders once a trip has been initiated (activeTripId set or home_origin non-empty).
 */
export function SaveTripButton() {
  const { state } = useTripContext();
  const { activeTripId, tripContext } = state;

  const [modalOpen, setModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copying, setCopying] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [modalOpen]);

  const shareUrl = activeTripId
    ? typeof window !== "undefined"
      ? `${window.location.origin}/t/${activeTripId}`
      : null
    : null;

  const handleSave = useCallback(async () => {
    if (!activeTripId) return;
    setSaving(true);
    try {
      const name = nameInput.trim() || null;
      if (name) {
        await api.renameTrip(activeTripId, name);
      }
      await api.saveTrip(activeTripId, state);
      setSaved(true);
      setModalOpen(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  }, [activeTripId, nameInput, state]);

  const handleShare = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopying(true);
      setTimeout(() => setCopying(false), 1500);
    } catch {
      window.prompt("Copy this link:", shareUrl);
    }
  }, [shareUrl]);

  const openModal = useCallback(() => {
    // Pre-fill with existing name if known (not tracked in state yet; leave empty)
    setNameInput("");
    setModalOpen(true);
  }, []);

  // Don't show until mounted (avoids SSR hydration mismatch) or until trip started
  if (!mounted || (!activeTripId && !tripContext.home_origin)) return null;

  return (
    <>
      {/* Pill */}
      <div
        className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-body"
        style={{
          background: "var(--glass-2)",
          border: "1px solid var(--glass-border-2)",
          backdropFilter: "blur(8px)",
        }}
      >
        <span style={{ color: "var(--text-muted)" }}>
          {activeTripId ? "Trip saved" : "Draft"}
        </span>

        <span style={{ color: "var(--glass-border-2)" }} className="mx-1">·</span>

        <button
          type="button"
          onClick={openModal}
          className="flex items-center gap-1 transition-colors font-medium"
          style={{ color: saved ? "var(--success)" : "var(--accent)" }}
          title="Save & name this trip"
        >
          {saved ? <Check size={11} /> : <Save size={11} />}
          {saved ? "Saved!" : "Save"}
        </button>

        {shareUrl && (
          <>
            <span style={{ color: "var(--glass-border-2)" }} className="mx-1">·</span>
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1 transition-colors"
              style={{ color: copying ? "var(--success)" : "var(--text-muted)" }}
              title="Copy share link"
            >
              <Share2 size={11} />
              {copying ? "Copied!" : "Share"}
            </button>
          </>
        )}
      </div>

      {/* Name modal */}
      <AnimatePresence>
        {modalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModalOpen(false)}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
            />

            {/* Modal */}
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed z-50 left-1/2 -translate-x-1/2 top-16 w-full max-w-sm rounded-2xl p-6 shadow-2xl"
              style={{
                background: "var(--glass-3)",
                border: "1px solid var(--glass-border-3)",
                backdropFilter: "blur(20px)",
              }}
            >
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="absolute top-4 right-4 rounded-lg p-1 transition-colors"
                style={{ color: "var(--text-muted)" }}
              >
                <X size={16} />
              </button>

              <p
                className="text-[10px] font-semibold uppercase tracking-[2.5px] mb-2 font-body"
                style={{ color: "var(--text-eyebrow)" }}
              >
                Save Trip
              </p>
              <h2 className="font-display text-xl mb-4" style={{ color: "var(--text-primary)" }}>
                Name your trip
              </h2>

              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                placeholder="e.g. Tokyo Summer 2026"
                className="w-full px-3 py-2.5 text-sm font-body rounded-xl mb-4"
                style={{
                  background: "var(--glass-1)",
                  border: "1px solid var(--glass-border-2)",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
                autoFocus
              />

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                  fullWidth
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving}
                  icon={saving ? undefined : <Save size={13} />}
                  fullWidth
                >
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
