import type { TripLeg } from "@/types/trip";
import { Ship, Check, ExternalLink, Info, Bed } from "lucide-react";

interface Props {
  leg: TripLeg;
}

export function FerrySegmentCard({ leg }: Props) {
  return (
    <div className="rounded-xl p-5 relative bg-surface border border-border shadow-sm">
      <span className="absolute top-4 right-4 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full font-body text-teal bg-teal-light border border-teal/30">
        <Check size={10} />
        Confirmed
      </span>

      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-teal-light">
          <Ship size={18} className="text-teal" />
        </div>
        <h3 className="text-lg font-semibold font-display text-ink">Ferry</h3>
      </div>

      <p className="text-base font-medium mb-1 font-body text-ink">
        {leg.origin} → {leg.destination}
      </p>
      <p className="text-sm mb-4 font-body text-ink-muted">
        Check schedules and book with your ferry operator.
      </p>

      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[2.5px] mb-2 font-body text-teal">
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
              className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-2 font-body transition-colors text-teal hover:text-teal-hover"
            >
              {link.label}
              <ExternalLink size={11} />
            </a>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-lg px-3 py-2 mb-3 bg-amber/10 border border-amber/30">
        <Bed size={13} className="shrink-0 mt-0.5 text-amber" />
        <p className="text-xs font-body text-amber">
          Tip: Overnight ferries often include cabin accommodation — factor this into your hotel bookings.
        </p>
      </div>

      <div className="flex items-start gap-2 rounded-lg px-3 py-2 bg-teal-light border border-teal/20">
        <Info size={13} className="shrink-0 mt-0.5 text-teal" />
        <p className="text-xs font-body text-ink-muted">
          Ferry tickets are not bookable in-app. Use the links above to find schedules.
        </p>
      </div>
    </div>
  );
}
