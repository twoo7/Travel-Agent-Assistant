"use client";

import { useState } from "react";

interface Props {
  defaultCityCode: string;
  onSearch: (params: { city_code: string; check_in: string; check_out: string }) => void;
  loading: boolean;
}

export function HotelSearchForm({ defaultCityCode, onSearch, loading }: Props) {
  const [form, setForm] = useState({
    city_code: defaultCityCode,
    check_in: "",
    check_out: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">City Code</label>
        <input
          name="city_code"
          value={form.city_code}
          onChange={handleChange}
          placeholder="PAR"
          maxLength={3}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase tracking-widest w-20 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Check-in</label>
        <input
          type="date"
          name="check_in"
          value={form.check_in}
          onChange={handleChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Check-out</label>
        <input
          type="date"
          name="check_out"
          value={form.check_out}
          onChange={handleChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button
        onClick={() => onSearch(form)}
        disabled={loading || !form.check_in || !form.check_out}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
      >
        {loading ? "Searching…" : "Search Hotels"}
      </button>
    </div>
  );
}
