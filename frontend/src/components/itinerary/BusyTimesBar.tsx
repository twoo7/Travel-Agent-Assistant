interface Props {
  busyTimes?: Record<string, number[]>;
  dayOfWeek?: string;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function BusyTimesBar({ busyTimes, dayOfWeek }: Props) {
  if (!busyTimes) return null;

  const key = dayOfWeek ?? DAYS[new Date().getDay()];
  const hours = busyTimes[key];
  if (!hours || hours.length === 0) return null;

  const slice = hours.slice(8, 22);

  return (
    <div className="mt-1.5">
      <div className="text-[10px] mb-0.5 font-body" style={{ color: "var(--text-muted)" }}>{key} busyness</div>
      <div className="flex gap-px h-4 items-end">
        {slice.map((val, i) => (
          <div
            key={i}
            className={`flex-1 rounded-sm ${
              val >= 80
                ? "bg-accent"
                : val >= 50
                ? "bg-warning"
                : val >= 20
                ? "bg-success"
                : ""
            }`}
            style={{ height: `${Math.max(2, (val / 100) * 16)}px`, ...(val < 20 ? { background: "rgba(255,255,255,0.12)" } : {}) }}
            title={`${8 + i}:00 — ${val}% busy`}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] mt-0.5 font-body" style={{ color: "var(--text-subtle)" }}>
        <span>8am</span>
        <span>10pm</span>
      </div>
    </div>
  );
}
