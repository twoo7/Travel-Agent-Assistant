"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const STEPS = [
  { label: "Trip Setup", href: "/" },
  { label: "Flights", href: "/flights" },
  { label: "Hotels", href: "/hotels" },
  { label: "Itinerary", href: "/itinerary" },
  { label: "Export", href: "/export" },
];

export function Stepper() {
  const pathname = usePathname();
  const currentIndex = STEPS.findIndex((s) => s.href === pathname);

  return (
    <nav className="w-full bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-40">
      <ol className="flex items-center gap-1 max-w-4xl mx-auto">
        {STEPS.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <li key={step.href} className="flex items-center gap-1 flex-1">
              <Link
                href={step.href}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                  isCurrent
                    ? "text-blue-600"
                    : isCompleted
                    ? "text-green-600 hover:text-green-700"
                    : "text-gray-400 pointer-events-none"
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isCurrent
                      ? "bg-blue-600 text-white"
                      : isCompleted
                      ? "bg-green-600 text-white"
                      : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {isCompleted ? "✓" : i + 1}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </Link>
              {i < STEPS.length - 1 && (
                <span className="text-gray-300 ml-auto mr-1 hidden sm:inline">›</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
