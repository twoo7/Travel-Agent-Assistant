interface Props {
  busyTimes?: Record<string, number[]>;
  dayOfWeek?: string; // e.g. "Saturday"
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function BusyTimesBar({ busyTimes, dayOfWeek }: Props) {
  if (!busyTimes) return null;

  const key = dayOfWeek ?? DAYS[new Date().getDay()];
  const hours = busyTimes[key];
  if (!hours || hours.length === 0) return null;

  // Show 8am-10pm (hours 8-22)
  const slice = hours.slice(8, 22);

  return (
    <div className="mt-1">
      <div className="text-xs text-gray-400 mb-0.5">{key} busyness</div>
      <div className="flex gap-px h-4 items-end">
        {slice.map((val, i) => (
          <div
            key={i}
            className={`flex-1 rounded-sm ${
              val >= 80
                ? "bg-red-400"
                : val >= 50
                ? "bg-amber-400"
                : val >= 20
                ? "bg-green-400"
                : "bg-gray-200"
            }`}
            style={{ height: `${Math.max(2, (val / 100) * 16)}px` }}
            title={`${8 + i}:00 — ${val}% busy`}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-300 mt-0.5">
        <span>8am</span>
        <span>10pm</span>
      </div>
    </div>
  );
}
