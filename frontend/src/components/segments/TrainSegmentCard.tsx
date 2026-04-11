import type { TripLeg } from "@/types/trip";
import { Train, Check, ExternalLink, Info } from "lucide-react";
import { getAirportCountry } from "@/utils/airportNames";

interface Props {
  leg: TripLeg;
}

const EUROPEAN_COUNTRIES = new Set([
  "AT", "BE", "CH", "CZ", "DE", "DK", "ES", "FI", "FR", "GB",
  "HR", "HU", "IT", "NL", "NO", "PL", "PT", "RO", "SE", "SK",
]);

function getBookingLinks(
  origin: string,
  destination: string
): { label: string; href: string }[] {
  const originCountry = getAirportCountry(origin);
  const destCountry = getAirportCountry(destination);

  if (originCountry === "JP" && destCountry === "JP") {
    return [
      { label: "JR Pass", href: "https://www.jrpass.com" },
      { label: "Hyperdia", href: "https://www.hyperdia.com" },
      { label: "Klook", href: "https://www.klook.com" },
    ];
  }

  if (originCountry === "KR" && destCountry === "KR") {
    return [
      { label: "Korail", href: "https://www.letskorail.com" },
      { label: "Klook", href: "https://www.klook.com" },
    ];
  }

  if (EUROPEAN_COUNTRIES.has(originCountry) && EUROPEAN_COUNTRIES.has(destCountry)) {
    return [
      { label: "Trainline", href: "https://www.trainline.eu" },
      { label: "Eurail", href: "https://www.eurail.com" },
      { label: "Rail Europe", href: "https://www.raileurope.com" },
    ];
  }

  return [
    { label: "The Man in Seat 61", href: "https://www.seat61.com" },
    { label: "Rome2Rio", href: "https://www.rome2rio.com" },
  ];
}

export function TrainSegmentCard({ leg }: Props) {
  const links = getBookingLinks(leg.origin, leg.destination);

  return (
    <div className="bg-success/5 border border-success/20 rounded-xl p-5 relative">
      <span className="absolute top-4 right-4 inline-flex items-center gap-1 text-xs font-semibold text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full font-body">
        <Check size={10} />
        Confirmed
      </span>

      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
          <Train size={18} className="text-success" />
        </div>
        <h3 className="text-lg font-semibold text-primary font-display">Train</h3>
      </div>

      <p className="text-base font-medium text-charcoal mb-4 font-body">
        {leg.origin} → {leg.destination}
      </p>

      <div className="mb-4">
        <p className="text-xs font-semibold text-charcoal/50 uppercase tracking-wide mb-2 font-body">Book on</p>
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-success-dark font-medium hover:text-success underline underline-offset-2 font-body transition-colors"
            >
              {link.label}
              <ExternalLink size={11} />
            </a>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2 bg-success/5 rounded-lg px-3 py-2">
        <Info size={13} className="text-success shrink-0 mt-0.5" />
        <p className="text-xs text-charcoal/60 font-body">
          Train tickets are not bookable in-app. Use the links above to find and book your journey.
        </p>
      </div>
    </div>
  );
}
