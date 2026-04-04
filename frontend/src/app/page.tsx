"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTripContext } from "@/context/TripContext";

export default function TripSetupPage() {
  const router = useRouter();
  const { dispatch } = useTripContext();

  const [form, setForm] = useState({
    home_origin: "",
    destination: "",
    departure_date: "",
    return_date: "",
    adults: 2,
    children: 0,
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    dispatch({
      type: "INIT_TRIP",
      payload: {
        home_origin: form.home_origin.toUpperCase(),
        adults: form.adults,
        children: form.children,
      },
    });
    dispatch({
      type: "ADD_LEG",
      payload: {
        leg_number: 1,
        origin: form.home_origin.toUpperCase(),
        destination: form.destination.toUpperCase(),
        departure_date: form.departure_date,
        hotel_stays: [],
        days: [],
      },
    });
    router.push("/flights");
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">✈️</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Plan Your Trip</h1>
        <p className="text-gray-500">Tell us where you&apos;re going to get started.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-5"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Home Airport <span className="text-gray-400 font-normal">(IATA code)</span>
          </label>
          <input
            name="home_origin"
            value={form.home_origin}
            onChange={handleChange}
            placeholder="e.g. JFK"
            required
            maxLength={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 uppercase tracking-widest text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            First Destination <span className="text-gray-400 font-normal">(IATA code)</span>
          </label>
          <input
            name="destination"
            value={form.destination}
            onChange={handleChange}
            placeholder="e.g. CDG"
            required
            maxLength={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 uppercase tracking-widest text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Departure Date</label>
            <input
              type="date"
              name="departure_date"
              value={form.departure_date}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Return Date <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="date"
              name="return_date"
              value={form.return_date}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adults</label>
            <input
              type="number"
              name="adults"
              value={form.adults}
              onChange={handleChange}
              min={1}
              max={9}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Children</label>
            <input
              type="number"
              name="children"
              value={form.children}
              onChange={handleChange}
              min={0}
              max={9}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors mt-2"
        >
          Start Planning →
        </button>
      </form>
    </div>
  );
}
