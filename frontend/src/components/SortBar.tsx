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
      <span className="text-muted mr-1 font-body">Sort:</span>
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`px-2.5 py-1 rounded-full transition-colors font-body ${
            value === opt.key
              ? "bg-primary/10 text-primary font-medium"
              : "bg-gray-100 text-charcoal/70 hover:bg-gray-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
