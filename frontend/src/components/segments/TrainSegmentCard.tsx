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
          style={{ background: "rgba(107,144,128,0.15)" }}
        >
          <Train size={18} style={{ color: "var(--success)" }} />
        </div>
        <h3 className="text-lg font-semibold font-display" style={{ color: "var(--text-primary)" }}>Train</h3>
      </div>

      <p className="text-base font-medium mb-4 font-body" style={{ color: "var(--text-primary)" }}>
        {leg.origin} → {leg.destination}
      </p>

      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[2.5px] mb-2 font-body" style={{ color: "var(--text-eyebrow)" }}>
          Book on
        </p>
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-2 font-body transition-colors"
              style={{ color: "var(--success)" }}
            >
              {link.label}
              <ExternalLink size={11} />
            </a>
          ))}
        </div>
      </div>

      <div
        className="flex items-start gap-2 rounded-lg px-3 py-2"
        style={{ background: "rgba(107,144,128,0.08)", border: "1px solid rgba(107,144,128,0.15)" }}
      >
        <Info size={13} className="shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
        <p className="text-xs font-body" style={{ color: "var(--text-muted)" }}>
          Train tickets are not bookable in-app. Use the links above to find and book your journey.
        </p>
      </div>
    </div>
  );
}
