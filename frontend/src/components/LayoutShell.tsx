"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { TopNav } from "@/components/TopNav";
import { PageTransition } from "@/components/ui/PageTransition";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <TopNav />
      <main className="min-h-screen pt-14">
        <AnimatePresence mode="wait">
          <PageTransition key={pathname}>
            {children}
          </PageTransition>
        </AnimatePresence>
      </main>
    </>
  );
}
