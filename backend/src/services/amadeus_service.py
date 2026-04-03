import logging
from typing import List
from amadeus import Client, ResponseError
from backend.src.config import Config
from backend.src.models.flight import FlightOffer, FlightSegment
from backend.src.models.hotel import HotelOffer

logger = logging.getLogger(__name__)


class AmadeusService:
    def __init__(self) -> None:
        Config.validate()
        self.client = Client(
            client_id=Config.AMADEUS_API_KEY,
            client_secret=Config.AMADEUS_API_SECRET,
        )

    def search_flights(
        self,
        origin: str,
        destination: str,
        departure_date: str,
        adults: int,
        max_results: int = 10,
        return_date: str | None = None,
    ) -> List[FlightOffer]:
        try:
            params: dict = {
                "originLocationCode": origin,
                "destinationLocationCode": destination,
                "departureDate": departure_date,
                "adults": adults,
                "max": max_results,
            }
            if return_date:
                params["returnDate"] = return_date

            response = self.client.shopping.flight_offers_search.get(**params)
            offers: List[FlightOffer] = []
            for raw in response.data:
                # Skip offers with no itineraries
                if not raw.get("itineraries"):
                    logger.warning("Skipping flight offer %s: no itineraries", raw.get("id"))
                    continue
                itinerary = raw["itineraries"][0]
                if not itinerary.get("segments"):
                    logger.warning("Skipping flight offer %s: no segments", raw.get("id"))
                    continue
                segments = [
                    FlightSegment(
                        departure_airport=seg["departure"]["iataCode"],
                        arrival_airport=seg["arrival"]["iataCode"],
                        departure_time=seg["departure"]["at"],
                        arrival_time=seg["arrival"]["at"],
                        duration=seg["duration"],
                        carrier_code=seg["carrierCode"],
                        flight_number=seg["number"],
                    )
                    for seg in itinerary["segments"]
                ]
                offers.append(
                    FlightOffer(
                        id=raw["id"],
                        price=float(raw["price"]["grandTotal"]),
                        currency=raw["price"]["currency"],
                        segments=segments,
                        total_duration=itinerary["duration"],
                        stops=sum(seg.get("numberOfStops", 0) for seg in itinerary["segments"]),
                    )
                )
            logger.info("Found %d flight offers for %s→%s", len(offers), origin, destination)
            return offers
        except ResponseError as e:
            logger.error("Amadeus flight search error: %s", e)
            raise

    def search_hotels(
        self,
        city_code: str,
        check_in: str,
        check_out: str,
        adults: int,
    ) -> List[HotelOffer]:
        try:
            response = self.client.shopping.hotel_offers_search.get(
                cityCode=city_code,
                checkInDate=check_in,
                checkOutDate=check_out,
                adults=adults,
            )
            offers: List[HotelOffer] = []
            for raw in response.data:
                hotel = raw["hotel"]
                if not raw.get("offers"):
                    logger.warning("Skipping hotel %s: no offers", hotel.get("hotelId"))
                    continue
                price = float(raw["offers"][0]["price"]["total"])
                currency = raw["offers"][0]["price"]["currency"]
                address_lines = hotel.get("address", {}).get("lines", [])
                offers.append(
                    HotelOffer(
                        id=hotel["hotelId"],
                        name=hotel["name"],
                        address=", ".join(address_lines),
                        lat=hotel.get("latitude", 0.0),
                        lng=hotel.get("longitude", 0.0),
                        price_per_night=price,
                        currency=currency,
                        rating=float(hotel["rating"]) if hotel.get("rating") else None,
                    )
                )
            logger.info("Found %d hotel offers for %s", len(offers), city_code)
            return offers
        except ResponseError as e:
            logger.error("Amadeus hotel search error: %s", e)
            raise
