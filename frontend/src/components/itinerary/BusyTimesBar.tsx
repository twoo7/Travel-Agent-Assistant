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
      <div className="text-[10px] mb-0.5 font-body text-ink-muted">{key} busyness</div>
      <div className="flex gap-px h-4 items-end">
        {slice.map((val, i) => (
          <div
            key={i}
            className={`flex-1 rounded-sm ${
              val >= 80
                ? "bg-red"
                : val >= 50
                ? "bg-amber"
                : val >= 20
                ? "bg-teal"
                : "bg-border"
            }`}
            style={{ height: `${Math.max(2, (val / 100) * 16)}px` }}
            title={`${8 + i}:00 — ${val}% busy`}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] mt-0.5 font-body text-ink-subtle">
        <span>8am</span>
        <span>10pm</span>
      </div>
    </div>
  );
}
