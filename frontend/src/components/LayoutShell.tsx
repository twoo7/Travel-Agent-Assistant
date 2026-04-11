"use client";

import React from "react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/Sidebar";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [pinned, setPinned] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <Sidebar pinned={pinned} onPinChange={setPinned} />
      <main
        className={[
          "min-h-screen transition-all duration-300 relative z-10",
          "pt-11",
          pinned ? "md:pt-0 md:pl-56" : "md:pt-0 md:pl-12",
        ].join(" ")}
      >
        <AnimatePresence mode="wait">
          <div key={pathname}>
            {children}
          </div>
        </AnimatePresence>
      </main>
    </>
  );
}
