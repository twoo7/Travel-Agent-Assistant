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
      <span className="text-gray-500 mr-1">Sort:</span>
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          className={`px-2.5 py-1 rounded-full transition-colors ${
            value === opt.key
              ? "bg-indigo-100 text-indigo-700 font-medium"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
