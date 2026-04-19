"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/Sidebar";
import { SaveTripButton } from "@/components/SaveTripButton";
import { PageTransition } from "@/components/ui/PageTransition";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [pinned, setPinned] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <Sidebar pinned={pinned} onPinChange={setPinned} />

      {/* Floating top-right header bar */}
      <div className="fixed top-3 right-4 z-30 flex items-center gap-2">
        {pathname !== "/trips" && <SaveTripButton />}
      </div>

      <main
        className={[
          "min-h-screen transition-all duration-300 relative z-10",
          "pt-11",
          pinned ? "md:pt-0 md:pl-56" : "md:pt-0 md:pl-12",
        ].join(" ")}
      >
        <AnimatePresence mode="wait">
          <PageTransition key={pathname}>
            {children}
          </PageTransition>
        </AnimatePresence>
      </main>
    </>
  );
}
