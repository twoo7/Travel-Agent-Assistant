import pytest
from unittest.mock import MagicMock, patch
from amadeus import ResponseError as AmadeusResponseError
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
    with patch("backend.src.services.amadeus_service.Config") as MockConfig, \
         patch("backend.src.services.amadeus_service.Client") as MockClient:
        MockConfig.validate.return_value = None
        MockConfig.AMADEUS_API_KEY = "test"
        MockConfig.AMADEUS_API_SECRET = "test"
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
    # Two-step search: first fetch hotel IDs by city, then search offers
    mock_hotel_ids = [{"hotelId": "TKYOGRAND"}]

    with patch("backend.src.services.amadeus_service.Config") as MockConfig, \
         patch("backend.src.services.amadeus_service.Client") as MockClient:
        MockConfig.validate.return_value = None
        MockConfig.AMADEUS_API_KEY = "test"
        MockConfig.AMADEUS_API_SECRET = "test"
        mock_client = MagicMock()
        MockClient.return_value = mock_client
        # Step 1: hotel IDs by city
        mock_client.reference_data.locations.hotels.by_city.get.return_value.data = mock_hotel_ids
        # Step 2: hotel offers for those IDs
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


def test_search_flights_empty_results():
    with patch("backend.src.services.amadeus_service.Config") as MockConfig, \
         patch("backend.src.services.amadeus_service.Client") as MockClient:
        MockConfig.validate.return_value = None
        MockConfig.AMADEUS_API_KEY = "test"
        MockConfig.AMADEUS_API_SECRET = "test"
        mock_client = MagicMock()
        MockClient.return_value = mock_client
        mock_client.shopping.flight_offers_search.get.return_value.data = []

        service = AmadeusService()
        offers = service.search_flights(origin="JFK", destination="NRT",
                                        departure_date="2026-06-10", adults=2)

    assert offers == []


def test_search_flights_raises_on_response_error():
    with patch("backend.src.services.amadeus_service.Config") as MockConfig, \
         patch("backend.src.services.amadeus_service.Client") as MockClient:
        MockConfig.validate.return_value = None
        MockConfig.AMADEUS_API_KEY = "test"
        MockConfig.AMADEUS_API_SECRET = "test"
        mock_client = MagicMock()
        MockClient.return_value = mock_client
        mock_client.shopping.flight_offers_search.get.side_effect = AmadeusResponseError(
            MagicMock(status_code=400, body='{"errors": [{"detail": "Bad request"}]}')
        )

        service = AmadeusService()
        with pytest.raises(AmadeusResponseError):
            service.search_flights(origin="JFK", destination="NRT",
                                   departure_date="2026-06-10", adults=2)


def test_search_hotels_retries_on_response_error():
    """When hotel_offers_search fails with full batch, retry with half."""
    with patch("backend.src.services.amadeus_service.Config") as MockConfig, \
         patch("backend.src.services.amadeus_service.Client") as MockClient:
        MockConfig.validate.return_value = None
        MockConfig.AMADEUS_API_KEY = "test"
        MockConfig.AMADEUS_API_SECRET = "test"
        mock_client = MagicMock()
        MockClient.return_value = mock_client

        by_city_resp = MagicMock()
        by_city_resp.data = [{"hotelId": f"HOTEL{i:04d}"} for i in range(10)]
        mock_client.reference_data.locations.hotels.by_city.get.return_value = by_city_resp

        mock_error = AmadeusResponseError(MagicMock(status_code=502, body="{}"))
        success_resp = MagicMock()
        success_resp.data = [{
            "hotel": {
                "hotelId": "HOTEL0000",
                "name": "Test Hotel",
                "address": {"lines": ["123 Test St"]},
                "latitude": 48.85,
                "longitude": 2.35,
            },
            "offers": [{"price": {"total": "150.00", "currency": "USD"}}],
        }]
        mock_client.shopping.hotel_offers_search.get.side_effect = [mock_error, success_resp]

        service = AmadeusService()
        results = service.search_hotels("PAR", "2025-06-01", "2025-06-05", 2)

    assert len(results) == 1
    assert results[0].name == "Test Hotel"
    assert mock_client.shopping.hotel_offers_search.get.call_count == 2
    second_call_kwargs = mock_client.shopping.hotel_offers_search.get.call_args_list[1]
    assert len(second_call_kwargs.kwargs.get("hotelIds", [])) == 5


def test_search_flights_skips_offer_with_no_itineraries():
    bad_offer = {"id": "bad", "price": {"grandTotal": "100.00", "currency": "USD"}, "itineraries": []}
    good_offer = MOCK_FLIGHT_RESPONSE["data"][0]

    with patch("backend.src.services.amadeus_service.Config") as MockConfig, \
         patch("backend.src.services.amadeus_service.Client") as MockClient:
        MockConfig.validate.return_value = None
        MockConfig.AMADEUS_API_KEY = "test"
        MockConfig.AMADEUS_API_SECRET = "test"
        mock_client = MagicMock()
        MockClient.return_value = mock_client
        mock_client.shopping.flight_offers_search.get.return_value.data = [bad_offer, good_offer]

        service = AmadeusService()
        offers = service.search_flights(origin="JFK", destination="NRT",
                                        departure_date="2026-06-10", adults=2)

    assert len(offers) == 1
    assert offers[0].id == "offer_1"


# ---------------------------------------------------------------------------
# Mock fallback tests (Bugs #3, #4)
# ---------------------------------------------------------------------------

def _make_500_error():
    """Create an Amadeus ResponseError that simulates an HTTP 500."""
    mock_response = MagicMock()
    mock_response.status_code = 500
    return AmadeusResponseError(mock_response)


def _make_401_error():
    mock_response = MagicMock()
    mock_response.status_code = 401
    return AmadeusResponseError(mock_response)


def test_search_flights_returns_mock_data_on_500_when_mock_enabled():
    with patch("backend.src.services.amadeus_service.Config") as MockConfig, \
         patch("backend.src.services.amadeus_service.Client") as MockClient:
        MockConfig.validate.return_value = None
        MockConfig.AMADEUS_API_KEY = "test"
        MockConfig.AMADEUS_API_SECRET = "test"
        MockConfig.AMADEUS_MOCK = True
        mock_client = MagicMock()
        MockClient.return_value = mock_client
        mock_client.shopping.flight_offers_search.get.side_effect = _make_500_error()

        service = AmadeusService()
        offers = service.search_flights("JFK", "NRT", "2026-06-01", 2)

        assert len(offers) == 3
        assert all(isinstance(o, FlightOffer) for o in offers)


def test_search_flights_reraises_500_when_mock_disabled():
    with patch("backend.src.services.amadeus_service.Config") as MockConfig, \
         patch("backend.src.services.amadeus_service.Client") as MockClient:
        MockConfig.validate.return_value = None
        MockConfig.AMADEUS_API_KEY = "test"
        MockConfig.AMADEUS_API_SECRET = "test"
        MockConfig.AMADEUS_MOCK = False
        mock_client = MagicMock()
        MockClient.return_value = mock_client
        mock_client.shopping.flight_offers_search.get.side_effect = _make_500_error()

        service = AmadeusService()
        with pytest.raises(AmadeusResponseError):
            service.search_flights("JFK", "NRT", "2026-06-01", 2)


def test_search_flights_always_reraises_non_500_errors():
    with patch("backend.src.services.amadeus_service.Config") as MockConfig, \
         patch("backend.src.services.amadeus_service.Client") as MockClient:
        MockConfig.validate.return_value = None
        MockConfig.AMADEUS_API_KEY = "test"
        MockConfig.AMADEUS_API_SECRET = "test"
        MockConfig.AMADEUS_MOCK = True  # even with mock on, non-500 errors re-raise
        mock_client = MagicMock()
        MockClient.return_value = mock_client
        mock_client.shopping.flight_offers_search.get.side_effect = _make_401_error()

        service = AmadeusService()
        with pytest.raises(AmadeusResponseError):
            service.search_flights("JFK", "NRT", "2026-06-01", 2)


def test_search_hotels_returns_mock_data_on_500_when_mock_enabled():
    with patch("backend.src.services.amadeus_service.Config") as MockConfig, \
         patch("backend.src.services.amadeus_service.Client") as MockClient:
        MockConfig.validate.return_value = None
        MockConfig.AMADEUS_API_KEY = "test"
        MockConfig.AMADEUS_API_SECRET = "test"
        MockConfig.AMADEUS_MOCK = True
        mock_client = MagicMock()
        MockClient.return_value = mock_client
        mock_client.reference_data.locations.hotels.by_city.get.side_effect = _make_500_error()

        service = AmadeusService()
        offers = service.search_hotels("TYO", "2026-06-01", "2026-06-05", 2)

        assert len(offers) == 4
        assert all(isinstance(o, HotelOffer) for o in offers)


def test_search_hotels_reraises_500_when_mock_disabled():
    with patch("backend.src.services.amadeus_service.Config") as MockConfig, \
         patch("backend.src.services.amadeus_service.Client") as MockClient:
        MockConfig.validate.return_value = None
        MockConfig.AMADEUS_API_KEY = "test"
        MockConfig.AMADEUS_API_SECRET = "test"
        MockConfig.AMADEUS_MOCK = False
        mock_client = MagicMock()
        MockClient.return_value = mock_client
        mock_client.reference_data.locations.hotels.by_city.get.side_effect = _make_500_error()

        service = AmadeusService()
        with pytest.raises(AmadeusResponseError):
            service.search_hotels("TYO", "2026-06-01", "2026-06-05", 2)
