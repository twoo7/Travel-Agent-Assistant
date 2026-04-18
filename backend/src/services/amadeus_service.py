import logging
from typing import List
from amadeus import Client, ResponseError
from backend.src.config import Config
from backend.src.models.flight import FlightOffer, FlightSegment
from backend.src.models.hotel import HotelOffer

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Mock data — returned when Amadeus sandbox returns HTTP 500 and AMADEUS_MOCK=true.
# Not returned in production unless the gate is explicitly on.
# ---------------------------------------------------------------------------

_MOCK_FLIGHTS: List[FlightOffer] = [
    FlightOffer(
        id="MOCK-F1",
        price=850.00,
        currency="USD",
        segments=[
            FlightSegment(
                departure_airport="JFK",
                arrival_airport="NRT",
                departure_time="2026-06-10T10:00:00",
                arrival_time="2026-06-11T14:00:00",
                duration="PT14H",
                carrier_code="JL",
                flight_number="006",
            )
        ],
        total_duration="PT14H",
        stops=0,
    ),
    FlightOffer(
        id="MOCK-F2",
        price=920.00,
        currency="USD",
        segments=[
            FlightSegment(
                departure_airport="JFK",
                arrival_airport="NRT",
                departure_time="2026-06-10T13:00:00",
                arrival_time="2026-06-11T16:30:00",
                duration="PT13H30M",
                carrier_code="NH",
                flight_number="110",
            )
        ],
        total_duration="PT13H30M",
        stops=0,
    ),
    FlightOffer(
        id="MOCK-F3",
        price=720.00,
        currency="USD",
        segments=[
            FlightSegment(
                departure_airport="JFK",
                arrival_airport="ICN",
                departure_time="2026-06-10T08:00:00",
                arrival_time="2026-06-11T11:30:00",
                duration="PT14H30M",
                carrier_code="KE",
                flight_number="082",
            )
        ],
        total_duration="PT14H30M",
        stops=1,
    ),
]

_MOCK_HOTELS: List[HotelOffer] = [
    HotelOffer(
        id="MOCK-H1",
        name="Hotel Gracery Shinjuku",
        address="1-19-1 Kabukicho, Shinjuku",
        lat=35.6938,
        lng=139.7034,
        price_per_night=180.00,
        currency="USD",
        rating=4.0,
    ),
    HotelOffer(
        id="MOCK-H2",
        name="Park Hyatt Tokyo",
        address="3-7-1-2 Nishi-Shinjuku, Shinjuku",
        lat=35.6864,
        lng=139.6900,
        price_per_night=350.00,
        currency="USD",
        rating=5.0,
    ),
    HotelOffer(
        id="MOCK-H3",
        name="The Prince Gallery Tokyo Kioicho",
        address="1-2 Kioicho, Chiyoda",
        lat=35.6791,
        lng=139.7353,
        price_per_night=290.00,
        currency="USD",
        rating=4.5,
    ),
    HotelOffer(
        id="MOCK-H4",
        name="Dormy Inn Asakusa",
        address="1-16-2 Asakusa, Taito",
        lat=35.7147,
        lng=139.7967,
        price_per_night=120.00,
        currency="USD",
        rating=3.5,
    ),
]

# ---------------------------------------------------------------------------


class AmadeusService:
    def __init__(self) -> None:
        Config.validate()
        self.client = Client(
            client_id=Config.AMADEUS_API_KEY,
            client_secret=Config.AMADEUS_API_SECRET,
            hostname="test",
        )

    @staticmethod
    def _is_mock() -> bool:
        import os as _os
        val = _os.getenv("AMADEUS_MOCK", "false")
        result = val.lower() == "true"
        print(f"[DEBUG] AMADEUS_MOCK env='{val}' -> _is_mock={result}", flush=True)
        return result

    def search_flights(
        self,
        origin: str,
        destination: str,
        departure_date: str,
        adults: int,
        max_results: int = 10,
        return_date: str | None = None,
        currency_code: str | None = None,
    ) -> List[FlightOffer]:
        if self._is_mock():
            logger.warning("AMADEUS_MOCK=true — returning mock flights without calling API")
            return list(_MOCK_FLIGHTS)
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
            if currency_code:
                params["currencyCode"] = currency_code

            response = self.client.shopping.flight_offers_search.get(**params)
            offers: List[FlightOffer] = []
            for raw in response.data:
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
            if e.response.status_code == 500 and Config.AMADEUS_MOCK:
                logger.warning(
                    "Amadeus flight search error (%s) — returning mock data (AMADEUS_MOCK=true)", e.response.status_code
                )
                return list(_MOCK_FLIGHTS)
            logger.error("Amadeus flight search error: %s", e)
            raise

    def search_hotels(
        self,
        city_code: str,
        check_in: str,
        check_out: str,
        adults: int,
        currency_code: str | None = None,
    ) -> List[HotelOffer]:
        if self._is_mock():
            logger.warning("AMADEUS_MOCK=true — returning mock hotels without calling API")
            return list(_MOCK_HOTELS)
        try:
            hotels_response = self.client.reference_data.locations.hotels.by_city.get(
                cityCode=city_code,
            )
        except ResponseError as e:
            if e.response.status_code == 500 and Config.AMADEUS_MOCK:
                logger.warning(
                    "Amadeus hotel lookup error (%s) — returning mock data (AMADEUS_MOCK=true)", e.response.status_code
                )
                return list(_MOCK_HOTELS)
            logger.error("Amadeus hotel lookup error: %s", e)
            raise

        hotel_ids = [h["hotelId"] for h in hotels_response.data if h.get("hotelId")][:10]
        if not hotel_ids:
            logger.warning("No hotels found in city %s", city_code)
            return []

        search_params: dict = {
            "hotelIds": ",".join(hotel_ids),
            "checkInDate": check_in,
            "checkOutDate": check_out,
            "adults": str(adults),
        }
        if currency_code:
            search_params["currency"] = currency_code

        try:
            response = self.client.shopping.hotel_offers_search.get(**search_params)
        except ResponseError as e:
            if e.response.status_code == 500 and Config.AMADEUS_MOCK:
                logger.warning(
                    "Amadeus hotel offers search error (%s) — returning mock data (AMADEUS_MOCK=true)", e.response.status_code
                )
                return list(_MOCK_HOTELS)
            retry_count = min(5, len(hotel_ids))
            logger.warning(
                "Hotel offers search failed with %d IDs, retrying with %d: %s",
                len(hotel_ids), retry_count, e,
            )
            search_params["hotelIds"] = ",".join(hotel_ids[:retry_count])
            try:
                response = self.client.shopping.hotel_offers_search.get(**search_params)
            except ResponseError:
                logger.error("Hotel offers retry also failed for %s", city_code)
                return []

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
