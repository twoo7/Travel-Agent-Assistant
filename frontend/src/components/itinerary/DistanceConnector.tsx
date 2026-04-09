interface Props {
  distanceKm?: number | null;
  travelTimeMins?: number | null;
}

export function DistanceConnector({ distanceKm, travelTimeMins }: Props) {
  if (distanceKm == null && travelTimeMins == null) {
    return (
      <div className="flex items-center py-1 px-3">
        <div className="border-l-2 border-dashed border-gray-200 h-4 ml-3" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-1 pl-6">
      <div className="border-l-2 border-dashed border-gray-200 h-4" />
      <span className="text-[11px] text-subtle font-body">
        {travelTimeMins != null ? `${travelTimeMins} min walk` : "—"}
        {distanceKm != null && ` · ${distanceKm.toFixed(1)} km`}
      </span>
    </div>
  );
}
