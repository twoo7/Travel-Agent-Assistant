"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTripContext } from "@/context/TripContext";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SaveModal } from "@/components/modals/SaveModal";
import { ShareModal } from "@/components/modals/ShareModal";
import {
  Menu, X,
  FolderOpen, Save, Share2, Check, ChevronDown,
  Sparkles,
} from "lucide-react";

const STEPS = [
  { label: "Setup",     short: "1",  href: "/",          staleKey: "trip-setup" },
  { label: "Segments",  short: "2",  href: "/segments",  staleKey: "segments" },
  { label: "Hotels",    short: "3",  href: "/hotels",    staleKey: "hotels" },
  { label: "Itinerary", short: "4",  href: "/itinerary", staleKey: "itinerary" },
  { label: "Export",    short: "5",  href: "/export",    staleKey: "export" },
];

type StepStatus = "active" | "done" | "stale" | "locked";

function useStepStatuses() {
  const pathname = usePathname();
  const { state } = useTripContext();
  const { staleSteps, tripContext, itinerary } = state;

  const currentIndex = STEPS.findIndex((s) => s.href === pathname);

  function isStepStale(staleKey: string) {
    return staleSteps.some((k) => k.startsWith(staleKey + "-"));
  }

  function isReturnLeg(destination: string) {
    return destination === tripContext.home_origin;
  }

  function isStepDone(index: number): boolean {
    switch (index) {
      case 0: return tripContext.legs.length > 0;
      case 1: return tripContext.legs.length > 0 && tripContext.legs.every(
        (l) => !!l.selected_flight || (l.transport_mode !== "flight" && l.transport_mode !== undefined)
      );
      case 2: return tripContext.legs.length > 0 && tripContext.legs
        .filter((l) => !isReturnLeg(l.destination))
        .every((l) => l.hotel_stays.length > 0);
      case 3: return itinerary.length > 0 || tripContext.legs.some((l) => l.days.length > 0);
      case 4: return itinerary.length > 0;
      default: return false;
    }
  }

  function isStepNavigable(index: number): boolean {
    if (index === 0) return true;
    if (isStepDone(index)) return true;
    return isStepDone(index - 1);
  }

  function stepStatus(index: number): StepStatus {
    if (index === currentIndex) return "active";
    const step = STEPS[index];
    if (step.staleKey && isStepStale(step.staleKey)) return "stale";
    if (isStepDone(index)) return "done";
    return "locked";
  }

  return { stepStatus, isStepNavigable };
}

function StepChip({ step, index, status, navigable }: {
  step: typeof STEPS[0];
  index: number;
  status: StepStatus;
  navigable: boolean;
}) {
  const isActive = status === "active";
  const isDone   = status === "done";
  const isStale  = status === "stale";
  const isLocked = !navigable;

  return (
    <Link
      href={step.href}
      tabIndex={isLocked ? -1 : 0}
      aria-current={isActive ? "page" : undefined}
      data-testid={`nav-step-${step.staleKey}`}
      style={{ pointerEvents: isLocked ? "none" : "auto" }}
      className={[
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium font-body transition-all duration-150",
        isActive
          ? "bg-teal text-surface"
          : isDone
            ? "text-teal hover:bg-teal-light"
            : isStale
              ? "text-amber hover:bg-amber/10"
              : "text-ink-subtle opacity-50",
      ].filter(Boolean).join(" ")}
    >
      {isDone && !isActive
        ? <Check size={12} strokeWidth={2.5} />
        : <span className="text-[11px] font-semibold w-4 text-center">{index + 1}</span>
      }
      <span className="hidden lg:inline">{step.label}</span>
    </Link>
  );
}

export function TopNav() {
  const pathname = usePathname();
  const { state } = useTripContext();
  const { activeTripId, tripContext, tripName } = state;
  const { stepStatus, isStepNavigable } = useStepStatuses();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const shareUrl = activeTripId && typeof window !== "undefined"
    ? `${window.location.origin}/t/${activeTripId}`
    : null;

  const tripStarted = !!(activeTripId || tripContext.home_origin);

  function handleSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center h-14 px-4 gap-4">
          {/* Wordmark */}
          <Link href="/" className="flex items-center gap-2 shrink-0 mr-2">
            <Sparkles size={16} className="text-teal" />
            <span className="font-display italic text-lg font-medium text-ink tracking-tight">Voyage</span>
          </Link>

          {/* Step chips — center */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center" aria-label="Trip steps">
            {STEPS.map((step, i) => (
              <StepChip
                key={step.href}
                step={step}
                index={i}
                status={stepStatus(i)}
                navigable={isStepNavigable(i)}
              />
            ))}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {/* My Trips */}
            <Link
              href="/trips"
              className={[
                "hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-body transition-colors",
                pathname === "/trips"
                  ? "text-teal bg-teal-light"
                  : "text-ink-muted hover:text-ink hover:bg-surface2",
              ].join(" ")}
            >
              <FolderOpen size={14} />
              <span>My Trips</span>
            </Link>

            {/* Account dropdown (save/share/theme) */}
            {mounted && tripStarted && (
              <div className="relative">
                <button
                  onClick={() => setAccountOpen((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border bg-surface text-sm font-body text-ink-muted hover:text-ink hover:bg-surface2 transition-colors"
                >
                  <span className="max-w-[120px] truncate">
                    {tripName ?? (activeTripId ? "Saved trip" : "Draft")}
                  </span>
                  <ChevronDown size={13} className={accountOpen ? "rotate-180 transition-transform" : "transition-transform"} />
                </button>

                <AnimatePresence>
                  {accountOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setAccountOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-1.5 w-48 bg-surface border border-border rounded-lg shadow-md overflow-hidden z-50"
                      >
                        <button
                          onClick={() => { setSaveModalOpen(true); setAccountOpen(false); }}
                          className="flex items-center gap-2.5 px-3 py-2.5 w-full text-sm font-body text-ink hover:bg-surface2 transition-colors"
                        >
                          {saved ? <Check size={14} className="text-green" /> : <Save size={14} />}
                          {saved ? "Saved!" : "Save trip"}
                        </button>
                        {shareUrl && (
                          <button
                            onClick={() => { setShareModalOpen(true); setAccountOpen(false); }}
                            className="flex items-center gap-2.5 px-3 py-2.5 w-full text-sm font-body text-ink hover:bg-surface2 transition-colors"
                          >
                            <Share2 size={14} />
                            Share trip
                          </button>
                        )}
                        <div className="border-t border-border">
                          <ThemeToggle />
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Theme toggle when no trip started */}
            {mounted && !tripStarted && (
              <div className="hidden md:block">
                <ThemeToggle className="py-1.5" />
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded text-ink-muted hover:text-ink hover:bg-surface2 transition-colors"
              aria-label="Open navigation"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              key="drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 h-full w-72 z-50 bg-surface border-l border-border flex flex-col md:hidden"
              role="dialog"
              aria-label="Navigation"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="font-display italic text-base font-medium text-ink">Voyage</span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded text-ink-subtle hover:text-ink hover:bg-surface2 transition-colors"
                  aria-label="Close navigation"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Steps */}
              <nav className="flex flex-col gap-0.5 p-2" aria-label="Trip steps">
                {STEPS.map((step, i) => {
                  const status = stepStatus(i);
                  const navigable = isStepNavigable(i);
                  const isActive = status === "active";
                  const isDone   = status === "done";
                  const isStale  = status === "stale";
                  const isLocked = !navigable;
                  return (
                    <Link
                      key={step.href}
                      href={step.href}
                      onClick={() => setMobileOpen(false)}
                      tabIndex={isLocked ? -1 : 0}
                      style={{ pointerEvents: isLocked ? "none" : "auto" }}
                      className={[
                        "flex items-center gap-3 px-3 py-2.5 rounded text-sm font-body transition-colors",
                        isActive   ? "bg-teal text-surface"
                          : isDone ? "text-teal hover:bg-teal-light"
                          : isStale ? "text-amber hover:bg-amber/10"
                          : "text-ink-subtle opacity-50",
                      ].filter(Boolean).join(" ")}
                    >
                      <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-semibold shrink-0">
                        {isDone && !isActive ? <Check size={11} strokeWidth={2.5} /> : i + 1}
                      </span>
                      {step.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="border-t border-border mt-1 p-2">
                <Link
                  href="/trips"
                  onClick={() => setMobileOpen(false)}
                  className={[
                    "flex items-center gap-3 px-3 py-2.5 rounded text-sm font-body transition-colors",
                    pathname === "/trips" ? "text-teal bg-teal-light" : "text-ink-muted hover:bg-surface2",
                  ].join(" ")}
                >
                  <FolderOpen size={16} />
                  My Trips
                </Link>
              </div>

              <div className="border-t border-border p-2 mt-auto">
                {mounted && tripStarted && (
                  <>
                    <button
                      onClick={() => { setSaveModalOpen(true); setMobileOpen(false); }}
                      className="flex items-center gap-2.5 px-3 py-2.5 w-full rounded text-sm font-body text-ink hover:bg-surface2 transition-colors"
                    >
                      <Save size={14} />
                      Save trip
                    </button>
                    {shareUrl && (
                      <button
                        onClick={() => { setShareModalOpen(true); setMobileOpen(false); }}
                        className="flex items-center gap-2.5 px-3 py-2.5 w-full rounded text-sm font-body text-ink hover:bg-surface2 transition-colors"
                      >
                        <Share2 size={14} />
                        Share trip
                      </button>
                    )}
                  </>
                )}
                <ThemeToggle />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modals */}
      <SaveModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSaved={handleSaved}
      />
      {shareUrl && (
        <ShareModal
          open={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          shareUrl={shareUrl}
        />
      )}
    </>
  );
}
