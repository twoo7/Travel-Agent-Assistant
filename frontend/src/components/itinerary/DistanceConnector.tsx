interface Props {
  distanceKm?: number | null;
  travelTimeMins?: number | null;
}

export function DistanceConnector({ distanceKm, travelTimeMins }: Props) {
  if (distanceKm == null && travelTimeMins == null) {
    return (
      <div className="flex items-center gap-2 py-1 px-3 text-gray-300">
        <div className="flex-1 border-l-2 border-dashed border-gray-200 h-5 ml-3" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-1 pl-6 text-xs text-gray-400">
      <div className="border-l-2 border-dashed border-gray-200 h-4" />
      <span>
        🚶 {travelTimeMins != null ? `${travelTimeMins} min` : "—"}
        {distanceKm != null && ` · ${distanceKm.toFixed(1)} km`}
      </span>
    </div>
  );
}
