import type { TripLeg } from "@/types/trip";

interface Props {
  leg: TripLeg;
}

export function TrainSegmentCard({ leg }: Props) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-5 relative">
      <span className="absolute top-4 right-4 text-xs font-semibold text-green-700 bg-green-100 border border-green-300 px-2 py-0.5 rounded-full">
        ✓ Confirmed
      </span>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">🚂</span>
        <h3 className="text-lg font-semibold text-green-900">Train</h3>
      </div>

      <p className="text-base font-medium text-gray-800 mb-1">
        {leg.origin} → {leg.destination}
      </p>
      <p className="text-sm text-gray-500 mb-4">
        Estimated journey: varies
      </p>

      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Book on</p>
        <div className="flex flex-wrap gap-2">
          <a
            href="https://www.trainline.eu"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-green-700 font-medium hover:text-green-900 underline underline-offset-2"
          >
            Trainline ↗
          </a>
          <a
            href="https://www.eurail.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-green-700 font-medium hover:text-green-900 underline underline-offset-2"
          >
            Eurail ↗
          </a>
          <a
            href="https://www.raileurope.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-green-700 font-medium hover:text-green-900 underline underline-offset-2"
          >
            Rail Europe ↗
          </a>
        </div>
      </div>

      <p className="text-xs text-gray-500 bg-green-100 rounded-lg px-3 py-2">
        ℹ️ Train tickets are not bookable in-app. Use the links above to find and book your journey.
      </p>
    </div>
  );
}
