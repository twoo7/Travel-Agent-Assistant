import type { TripLeg } from "@/types/trip";
import { Ship, Check, ExternalLink, Info, Bed } from "lucide-react";

interface Props {
  leg: TripLeg;
}

export function FerrySegmentCard({ leg }: Props) {
  return (
    <div className="bg-primary/5 border border-primary/15 rounded-xl p-5 relative">
      <span className="absolute top-4 right-4 inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full font-body">
        <Check size={10} />
        Confirmed
      </span>

      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Ship size={18} className="text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-primary font-display">Ferry</h3>
      </div>

      <p className="text-base font-medium text-charcoal mb-1 font-body">
        {leg.origin} → {leg.destination}
      </p>
      <p className="text-sm text-muted mb-4 font-body">
        Check schedules and book with your ferry operator.
      </p>

      <div className="mb-4">
        <p className="text-xs font-semibold text-charcoal/50 uppercase tracking-wide mb-2 font-body">Popular operators</p>
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
              className="inline-flex items-center gap-1 text-sm text-primary font-medium hover:text-primary-dark underline underline-offset-2 font-body transition-colors"
            >
              {link.label}
              <ExternalLink size={11} />
            </a>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2 bg-warning/10 border border-warning/20 rounded-lg px-3 py-2 mb-3">
        <Bed size={13} className="text-warning-dark shrink-0 mt-0.5" />
        <p className="text-xs text-warning-dark font-body">
          Tip: Overnight ferries often include cabin accommodation — factor this into your hotel bookings.
        </p>
      </div>

      <div className="flex items-start gap-2 bg-primary/5 rounded-lg px-3 py-2">
        <Info size={13} className="text-primary shrink-0 mt-0.5" />
        <p className="text-xs text-charcoal/60 font-body">
          Ferry tickets are not bookable in-app. Use the links above to find schedules.
        </p>
      </div>
    </div>
  );
}
