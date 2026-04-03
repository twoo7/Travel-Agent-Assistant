from unittest.mock import MagicMock, patch
from backend.src.services.amadeus_service import AmadeusService
from backend.src.models.flight import FlightOffer
from backend.src.models.hotel import HotelOffer


MOCK_FLIGHT_RESPONSE = {
    "data": [
        {
            "id": "offer_1",
            "price": {"grandTotal": "850.00", "currency": "USD"},
            "itineraries": [
                {
                    "duration": "PT14H",
                    "segments": [
                        {
                            "departure": {"iataCode": "JFK", "at": "2026-06-10T10:00:00"},
                            "arrival": {"iataCode": "NRT", "at": "2026-06-11T14:00:00"},
                            "duration": "PT14H",
                            "carrierCode": "JL",
                            "number": "006",
                            "numberOfStops": 0,
                        }
                    ],
                }
            ],
        }
    ]
}

MOCK_HOTEL_RESPONSE = {
    "data": [
        {
            "hotel": {
                "hotelId": "hotel_1",
                "name": "Tokyo Grand Hotel",
                "address": {"lines": ["1-1 Chiyoda"], "cityName": "Tokyo"},
                "latitude": 35.6762,
                "longitude": 139.6503,
                "rating": "4",
            },
            "offers": [{"price": {"total": "180.00", "currency": "USD"}}],
        }
    ]
}


def test_search_flights_returns_flight_offers():
    with patch("backend.src.services.amadeus_service.Client") as MockClient:
        mock_client = MagicMock()
        MockClient.return_value = mock_client
        mock_client.shopping.flight_offers_search.get.return_value.data = MOCK_FLIGHT_RESPONSE["data"]

        service = AmadeusService()
        offers = service.search_flights(
            origin="JFK", destination="NRT",
            departure_date="2026-06-10", adults=2, max_results=10
        )

    assert len(offers) == 1
    assert isinstance(offers[0], FlightOffer)
    assert offers[0].price == 850.0
    assert offers[0].stops == 0
    assert offers[0].segments[0].carrier_code == "JL"


def test_search_hotels_returns_hotel_offers():
    with patch("backend.src.services.amadeus_service.Client") as MockClient:
        mock_client = MagicMock()
        MockClient.return_value = mock_client
        mock_client.shopping.hotel_offers_search.get.return_value.data = MOCK_HOTEL_RESPONSE["data"]

        service = AmadeusService()
        offers = service.search_hotels(
            city_code="TYO", check_in="2026-06-10",
            check_out="2026-06-14", adults=2
        )

    assert len(offers) == 1
    assert isinstance(offers[0], HotelOffer)
    assert offers[0].name == "Tokyo Grand Hotel"
    assert offers[0].price_per_night == 180.0
