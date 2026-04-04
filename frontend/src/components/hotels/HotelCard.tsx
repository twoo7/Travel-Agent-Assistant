import type { HotelOffer } from "@/types/trip";

interface Props {
  offer: HotelOffer;
  selected: boolean;
  onSelect: (offer: HotelOffer) => void;
}

function StarRating({ rating }: { rating?: number }) {
  if (!rating) return null;
  const filled = Math.round(rating);
  return (
    <span className="text-xs text-amber-500">
      {"★".repeat(filled)}{"☆".repeat(5 - filled)}
      <span className="text-gray-500 ml-1">{rating.toFixed(1)}</span>
    </span>
  );
}

export function HotelCard({ offer, selected, onSelect }: Props) {
  return (
    <div
      onClick={() => onSelect(offer)}
      className={`relative border rounded-xl p-4 cursor-pointer transition-all ${
        selected
          ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500"
          : "border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm"
      }`}
    >
      {offer.ai_recommended && (
        <span className="absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          ✨ AI Pick
        </span>
      )}

      <div className="flex items-start justify-between pr-20">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{offer.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{offer.address}</p>
          <div className="mt-1">
            <StarRating rating={offer.rating} />
          </div>
        </div>
        <div className="text-right ml-4 shrink-0">
          <div className="text-xl font-bold text-gray-900">
            {offer.currency} {offer.price_per_night.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">per night</div>
        </div>
      </div>

      {offer.ai_reason && (
        <p className="mt-3 text-xs text-blue-600 italic border-t border-blue-100 pt-2">
          ✨ {offer.ai_reason}
        </p>
      )}
    </div>
  );
}
