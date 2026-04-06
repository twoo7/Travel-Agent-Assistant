"""Tests for FlightAgent and HotelAgent (mocked Anthropic client)."""
from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

import pytest

from backend.src.models.flight import FlightOffer, FlightSegment
from backend.src.models.hotel import HotelOffer
from backend.src.models.trip import TripContext


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_segment() -> FlightSegment:
    return FlightSegment(
        departure_airport="JFK",
        arrival_airport="LAX",
        departure_time="2025-06-01T08:00:00",
        arrival_time="2025-06-01T11:30:00",
        duration="PT5H30M",
        carrier_code="AA",
        flight_number="AA100",
    )


def _make_flight_offers() -> list[FlightOffer]:
    return [
        FlightOffer(
            id="F1",
            price=350.0,
            currency="USD",
            segments=[_make_segment()],
            total_duration="PT5H30M",
            stops=0,
        ),
        FlightOffer(
            id="F2",
            price=280.0,
            currency="USD",
            segments=[_make_segment()],
            total_duration="PT7H00M",
            stops=1,
        ),
    ]


def _make_hotel_offers() -> list[HotelOffer]:
    return [
        HotelOffer(
            id="H1",
            name="Grand Hotel",
            address="123 Main St",
            lat=40.7128,
            lng=-74.0060,
            price_per_night=200.0,
            currency="USD",
            rating=4.5,
        ),
        HotelOffer(
            id="H2",
            name="Budget Inn",
            address="456 Oak Ave",
            lat=40.7130,
            lng=-74.0065,
            price_per_night=90.0,
            currency="USD",
            rating=3.2,
        ),
    ]


def _make_trip_context() -> TripContext:
    return TripContext(home_origin="JFK", adults=2, children=0)


def _mock_anthropic_response(recommended_id: str, reason_bullets: list[str]) -> MagicMock:
    """Return a mock that mimics anthropic.Anthropic().messages.create(...)."""
    content_block = MagicMock()
    content_block.text = json.dumps({"recommended_id": recommended_id, "reason_bullets": reason_bullets})
    message = MagicMock()
    message.content = [content_block]
    mock_client = MagicMock()
    mock_client.messages.create.return_value = message
    return mock_client


# ---------------------------------------------------------------------------
# FlightAgent tests
# ---------------------------------------------------------------------------

class TestFlightAgent:
    def test_recommended_offer_is_marked(self):
        """The offer with the id returned by Claude gets ai_recommended=True."""
        bullets = ["💰 Best value non-stop flight."]
        mock_client = _mock_anthropic_response("F1", bullets)

        with patch("backend.src.agents.flight_agent.Config") as mock_cfg, \
             patch("backend.src.agents.flight_agent.anthropic.Anthropic", return_value=mock_client):
            mock_cfg.ANTHROPIC_API_KEY = "test-key"
            from backend.src.agents.flight_agent import FlightAgent
            agent = FlightAgent()
            offers = _make_flight_offers()
            result = agent.rank_and_recommend(offers, _make_trip_context())

        recommended = [o for o in result if o.ai_recommended]
        not_recommended = [o for o in result if not o.ai_recommended]
        assert len(recommended) == 1
        assert recommended[0].id == "F1"
        assert recommended[0].ai_reason_bullets == bullets
        assert recommended[0].ai_reason == "💰 Best value non-stop flight."
        assert len(not_recommended) == 1
        assert not_recommended[0].id == "F2"

    def test_other_offers_are_not_recommended(self):
        """Only the picked offer has ai_recommended=True; others are explicitly False."""
        mock_client = _mock_anthropic_response("F2", ["💰 Cheapest option."])

        with patch("backend.src.agents.flight_agent.Config") as mock_cfg, \
             patch("backend.src.agents.flight_agent.anthropic.Anthropic", return_value=mock_client):
            mock_cfg.ANTHROPIC_API_KEY = "test-key"
            from backend.src.agents.flight_agent import FlightAgent
            agent = FlightAgent()
            offers = _make_flight_offers()
            result = agent.rank_and_recommend(offers, _make_trip_context())

        for o in result:
            if o.id == "F2":
                assert o.ai_recommended is True
            else:
                assert o.ai_recommended is False

    def test_empty_offers_returns_empty(self):
        """No crash when offers list is empty."""
        with patch("backend.src.agents.flight_agent.Config") as mock_cfg, \
             patch("backend.src.agents.flight_agent.anthropic.Anthropic") as mock_cls:
            mock_cfg.ANTHROPIC_API_KEY = "test-key"
            from backend.src.agents.flight_agent import FlightAgent
            agent = FlightAgent()
            result = agent.rank_and_recommend([], _make_trip_context())

        assert result == []
        mock_cls.return_value.messages.create.assert_not_called()

    def test_fallback_on_api_error(self):
        """When Claude raises an exception, the cheapest offer is selected."""
        mock_client = MagicMock()
        mock_client.messages.create.side_effect = Exception("API error")

        with patch("backend.src.agents.flight_agent.Config") as mock_cfg, \
             patch("backend.src.agents.flight_agent.anthropic.Anthropic", return_value=mock_client):
            mock_cfg.ANTHROPIC_API_KEY = "test-key"
            from backend.src.agents.flight_agent import FlightAgent
            agent = FlightAgent()
            offers = _make_flight_offers()
            result = agent.rank_and_recommend(offers, _make_trip_context())

        # F2 is cheaper (280 < 350)
        recommended = [o for o in result if o.ai_recommended]
        assert len(recommended) == 1
        assert recommended[0].id == "F2"

    def test_claude_is_called_with_model(self):
        """Verify the correct model is passed to messages.create."""
        mock_client = _mock_anthropic_response("F1", ["💰 Good pick."])

        with patch("backend.src.agents.flight_agent.Config") as mock_cfg, \
             patch("backend.src.agents.flight_agent.anthropic.Anthropic", return_value=mock_client):
            mock_cfg.ANTHROPIC_API_KEY = "test-key"
            from backend.src.agents.flight_agent import FlightAgent
            agent = FlightAgent()
            agent.rank_and_recommend(_make_flight_offers(), _make_trip_context())

        call_kwargs = mock_client.messages.create.call_args
        assert call_kwargs.kwargs.get("model") == "claude-sonnet-4-6"


# ---------------------------------------------------------------------------
# HotelAgent tests
# ---------------------------------------------------------------------------

class TestHotelAgent:
    def test_recommended_hotel_is_marked(self):
        """The hotel with the id returned by Claude gets ai_recommended=True."""
        bullets = ["⭐ Highly rated centrally located hotel."]
        mock_client = _mock_anthropic_response("H1", bullets)

        with patch("backend.src.agents.hotel_agent.Config") as mock_cfg, \
             patch("backend.src.agents.hotel_agent.anthropic.Anthropic", return_value=mock_client):
            mock_cfg.ANTHROPIC_API_KEY = "test-key"
            from backend.src.agents.hotel_agent import HotelAgent
            agent = HotelAgent()
            offers = _make_hotel_offers()
            result = agent.rank_and_recommend(offers, _make_trip_context())

        recommended = [o for o in result if o.ai_recommended]
        assert len(recommended) == 1
        assert recommended[0].id == "H1"
        assert recommended[0].ai_reason_bullets == bullets
        assert recommended[0].ai_reason == "⭐ Highly rated centrally located hotel."

    def test_other_hotels_are_not_recommended(self):
        """Non-selected hotels explicitly have ai_recommended=False."""
        mock_client = _mock_anthropic_response("H2", ["💰 Best price."])

        with patch("backend.src.agents.hotel_agent.Config") as mock_cfg, \
             patch("backend.src.agents.hotel_agent.anthropic.Anthropic", return_value=mock_client):
            mock_cfg.ANTHROPIC_API_KEY = "test-key"
            from backend.src.agents.hotel_agent import HotelAgent
            agent = HotelAgent()
            offers = _make_hotel_offers()
            result = agent.rank_and_recommend(offers, _make_trip_context())

        for o in result:
            expected = o.id == "H2"
            assert o.ai_recommended is expected

    def test_empty_offers_returns_empty(self):
        """No crash when offers list is empty."""
        with patch("backend.src.agents.hotel_agent.Config") as mock_cfg, \
             patch("backend.src.agents.hotel_agent.anthropic.Anthropic") as mock_cls:
            mock_cfg.ANTHROPIC_API_KEY = "test-key"
            from backend.src.agents.hotel_agent import HotelAgent
            agent = HotelAgent()
            result = agent.rank_and_recommend([], _make_trip_context())

        assert result == []
        mock_cls.return_value.messages.create.assert_not_called()

    def test_fallback_on_api_error_picks_best_rated(self):
        """When Claude raises, the best-rated hotel is selected."""
        mock_client = MagicMock()
        mock_client.messages.create.side_effect = Exception("API error")

        with patch("backend.src.agents.hotel_agent.Config") as mock_cfg, \
             patch("backend.src.agents.hotel_agent.anthropic.Anthropic", return_value=mock_client):
            mock_cfg.ANTHROPIC_API_KEY = "test-key"
            from backend.src.agents.hotel_agent import HotelAgent
            agent = HotelAgent()
            offers = _make_hotel_offers()
            result = agent.rank_and_recommend(offers, _make_trip_context())

        # H1 has rating 4.5 > H2's 3.2
        recommended = [o for o in result if o.ai_recommended]
        assert len(recommended) == 1
        assert recommended[0].id == "H1"

    def test_claude_is_called_with_model(self):
        """Verify the correct model is passed to messages.create."""
        mock_client = _mock_anthropic_response("H1", ["💰 Great choice."])

        with patch("backend.src.agents.hotel_agent.Config") as mock_cfg, \
             patch("backend.src.agents.hotel_agent.anthropic.Anthropic", return_value=mock_client):
            mock_cfg.ANTHROPIC_API_KEY = "test-key"
            from backend.src.agents.hotel_agent import HotelAgent
            agent = HotelAgent()
            agent.rank_and_recommend(_make_hotel_offers(), _make_trip_context())

        call_kwargs = mock_client.messages.create.call_args
        assert call_kwargs.kwargs.get("model") == "claude-sonnet-4-6"
