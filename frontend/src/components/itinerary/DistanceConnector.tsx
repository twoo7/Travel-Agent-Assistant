interface Props {
  distanceKm?: number | null;
  travelTimeMins?: number | null;
}

export function DistanceConnector({ distanceKm, travelTimeMins }: Props) {
  if (distanceKm == null && travelTimeMins == null) {
    return (
      <div className="flex items-center py-1 px-3">
        <div className="border-l-2 border-dashed h-4 ml-3" style={{ borderColor: "var(--glass-border-2)" }} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-1 pl-6">
      <div className="border-l-2 border-dashed h-4" style={{ borderColor: "var(--glass-border-2)" }} />
      <span className="text-[11px] font-body" style={{ color: "var(--text-subtle)" }}>
        {travelTimeMins != null ? `${travelTimeMins} min walk` : "—"}
        {distanceKm != null && ` · ${distanceKm.toFixed(1)} km`}
      </span>
    </div>
  );
}
