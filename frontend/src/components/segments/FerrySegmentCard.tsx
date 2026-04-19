import type { TripLeg } from "@/types/trip";
import { Ship, Check, ExternalLink, Info, Bed } from "lucide-react";

interface Props {
  leg: TripLeg;
}

export function FerrySegmentCard({ leg }: Props) {
  return (
    <div
      className="rounded-xl p-5 relative"
      style={{
        background: "var(--glass-2)",
        border: "1px solid var(--glass-border-2)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
        backdropFilter: "blur(12px)",
      }}
    >
      <span
        className="absolute top-4 right-4 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full font-body"
        style={{ color: "var(--success)", background: "rgba(107,144,128,0.15)", border: "1px solid rgba(107,144,128,0.3)" }}
      >
        <Check size={10} />
        Confirmed
      </span>

      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(224,122,95,0.15)" }}
        >
          <Ship size={18} style={{ color: "var(--accent)" }} />
        </div>
        <h3 className="text-lg font-semibold font-display" style={{ color: "var(--text-primary)" }}>Ferry</h3>
      </div>

      <p className="text-base font-medium mb-1 font-body" style={{ color: "var(--text-primary)" }}>
        {leg.origin} → {leg.destination}
      </p>
      <p className="text-sm mb-4 font-body" style={{ color: "var(--text-muted)" }}>
        Check schedules and book with your ferry operator.
      </p>

      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[2.5px] mb-2 font-body" style={{ color: "var(--text-eyebrow)" }}>
          Popular operators
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "DFDS", href: "https://www.dfds.com" },
            { label: "Stena Line", href: "https://www.stenaline.com" },
            { label: "Irish Ferries", href: "https://www.irishferries.com" },
            { label: "Brittany Ferries", href: "https://www.brittanyferries.com" },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-2 font-body transition-colors"
              style={{ color: "var(--accent)" }}
            >
              {link.label}
              <ExternalLink size={11} />
            </a>
          ))}
        </div>
      </div>

      <div
        className="flex items-start gap-2 rounded-lg px-3 py-2 mb-3"
        style={{ background: "rgba(212,165,116,0.08)", border: "1px solid rgba(212,165,116,0.15)" }}
      >
        <Bed size={13} className="shrink-0 mt-0.5" style={{ color: "var(--warning)" }} />
        <p className="text-xs font-body" style={{ color: "var(--warning)" }}>
          Tip: Overnight ferries often include cabin accommodation — factor this into your hotel bookings.
        </p>
      </div>

      <div
        className="flex items-start gap-2 rounded-lg px-3 py-2"
        style={{ background: "rgba(224,122,95,0.08)", border: "1px solid rgba(224,122,95,0.15)" }}
      >
        <Info size={13} className="shrink-0 mt-0.5" style={{ color: "var(--accent)" }} />
        <p className="text-xs font-body" style={{ color: "var(--text-muted)" }}>
          Ferry tickets are not bookable in-app. Use the links above to find schedules.
        </p>
      </div>
    </div>
  );
}
