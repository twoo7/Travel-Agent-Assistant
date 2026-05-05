"use client";

export interface SortOption {
  key: string;
  label: string;
}

interface Props {
  options: SortOption[];
  value: string;
  onChange: (key: string) => void;
}

export function SortBar({ options, value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="mr-1 font-body text-ink-muted">Sort:</span>
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className={[
              "px-2.5 py-1 rounded-full transition-colors font-body",
              active
                ? "font-medium bg-teal-light text-teal"
                : "bg-surface2 text-ink-muted",
            ].join(" ")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
