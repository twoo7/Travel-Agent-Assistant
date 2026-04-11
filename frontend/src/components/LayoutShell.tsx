"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [pinned, setPinned] = useState(false);

  return (
    <>
      <Sidebar pinned={pinned} onPinChange={setPinned} />
      <main
        className={[
          "min-h-screen transition-all duration-300",
          // Mobile: sidebar is a fixed top bar (h-11), so pad the top
          "pt-11",
          // Desktop: sidebar is a fixed left rail; pad left to clear it
          // collapsed = w-12 (3rem); pinned/expanded = w-56 (14rem)
          pinned ? "md:pt-0 md:pl-56" : "md:pt-0 md:pl-12",
        ].join(" ")}
      >
        {children}
      </main>
    </>
  );
}
