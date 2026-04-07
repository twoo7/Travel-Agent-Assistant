import type { TripLeg } from "@/types/trip";

interface Props {
  leg: TripLeg;
}

export function FerrySegmentCard({ leg }: Props) {
  return (
    <div className="bg-sky-50 border border-sky-200 rounded-xl p-5 relative">
      <span className="absolute top-4 right-4 text-xs font-semibold text-sky-700 bg-sky-100 border border-sky-300 px-2 py-0.5 rounded-full">
        ✓ Confirmed
      </span>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">⛴</span>
        <h3 className="text-lg font-semibold text-sky-900">Ferry</h3>
      </div>

      <p className="text-base font-medium text-gray-800 mb-1">
        {leg.origin} → {leg.destination}
      </p>
      <p className="text-sm text-gray-500 mb-4">
        Check schedules and book with your ferry operator.
      </p>

      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Popular operators</p>
        <div className="flex flex-wrap gap-2">
          <a
            href="https://www.dfds.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-sky-700 font-medium hover:text-sky-900 underline underline-offset-2"
          >
            DFDS ↗
          </a>
          <a
            href="https://www.stenaline.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-sky-700 font-medium hover:text-sky-900 underline underline-offset-2"
          >
            Stena Line ↗
          </a>
          <a
            href="https://www.irishferries.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-sky-700 font-medium hover:text-sky-900 underline underline-offset-2"
          >
            Irish Ferries ↗
          </a>
          <a
            href="https://www.brittanyferries.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-sky-700 font-medium hover:text-sky-900 underline underline-offset-2"
          >
            Brittany Ferries ↗
          </a>
        </div>
      </div>

      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
        🛏 Tip: Overnight ferries often include cabin accommodation — factor this into your hotel bookings.
      </p>

      <p className="text-xs text-gray-500 bg-sky-100 rounded-lg px-3 py-2">
        ℹ️ Ferry tickets are not bookable in-app. Use the links above to find schedules.
      </p>
    </div>
  );
}
