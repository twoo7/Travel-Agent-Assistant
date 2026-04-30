import type { TripLeg, HotelOffer, HotelStay } from "@/types/trip";

export function flightBookingUrl(leg: TripLeg): string {
  const query = `Flights from ${leg.origin} to ${leg.destination} on ${leg.departure_date}`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;
}

export function hotelBookingUrl(offer: HotelOffer, stay: HotelStay): string {
  const params = new URLSearchParams({
    ss: offer.name,
    checkin: stay.check_in,
    checkout: stay.check_out,
  });
  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}
