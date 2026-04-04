"""Tests for POIAgent and ItineraryAgent (all external calls mocked)."""
from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

import pytest

from backend.src.models.poi import POI
from backend.src.models.trip import DayItem, DayPlan, TripContext, TripLeg


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_trip_context_with_leg() -> TripContext:
    leg = TripLeg(
        leg_number=1,
        origin="JFK",
        destination="Paris",
        departure_date="2025-06-01",
        days=[
            DayPlan(
                day_number=1,
                date="2025-06-02",
                leg_number=1,
                city="Paris",
                items=[
                    DayItem(
                        type="poi",
                        name="Eiffel Tower",
                        address="Champ de Mars, Paris",
                        lat=48.8584,
                        lng=2.2945,
                    ),
                    DayItem(
                        type="poi",
                        name="Louvre Museum",
                        address="Rue de Rivoli, Paris",
                        lat=48.8606,
                        lng=2.3376,
                    ),
                ],
            ),
            DayPlan(
                day_number=2,
                date="2025-06-03",
                leg_number=1,
                city="Paris",
                items=[
                    DayItem(
                        type="poi",
                        name="Montmartre",
                        address="18th arrondissement, Paris",
                        lat=48.8867,
                        lng=2.3431,
                    ),
                ],
            ),
        ],
    )
    return TripContext(home_origin="JFK", adults=2, children=1, legs=[leg])


def _mock_claude_response(content: str) -> MagicMock:
    block = MagicMock()
    block.text = content
    msg = MagicMock()
    msg.content = [block]
    client = MagicMock()
    client.messages.create.return_value = msg
    return client


_SAMPLE_POI_SUGGESTIONS = json.dumps([
    {
        "name": "Eiffel Tower",
        "category": "landmark",
        "claude_note": "The icon of Paris.",
        "claude_best_time": "Sunset",
        "claude_booking_tip": "Book skip-the-line tickets in advance.",
    },
    {
        "name": "Louvre Museum",
        "category": "museum",
        "claude_note": "Home of the Mona Lisa.",
        "claude_best_time": "Weekday morning",
        "claude_booking_tip": "Reserve online to avoid queues.",
    },
])

_SAMPLE_GOOGLE_PLACE = {
    "place_id": "ChIJLU7jZClu5kcR4PcOOO6p3I0",
    "name": "Eiffel Tower",
    "address": "Champ de Mars, 5 Av. Anatole France, 75007 Paris",
    "lat": 48.8584,
    "lng": 2.2945,
    "rating": 4.7,
    "review_count": 200000,
    "price_level": None,
    "opening_hours": "Mon-Sun 9am-12am",
    "photo_url": None,
}


# ---------------------------------------------------------------------------
# POIAgent tests
# ---------------------------------------------------------------------------

class TestPOIAgent:
    def test_returns_pois_enriched_by_google(self):
        """Claude suggestions are enriched with Google Places data."""
        mock_claude = _mock_claude_response(_SAMPLE_POI_SUGGESTIONS)
        mock_places = MagicMock()
        mock_places.search_places.return_value = [_SAMPLE_GOOGLE_PLACE]

        with patch("backend.src.agents.poi_agent.Config") as mock_cfg, \
             patch("backend.src.agents.poi_agent.anthropic.Anthropic", return_value=mock_claude):
            mock_cfg.ANTHROPIC_API_KEY = "test-key"
            from backend.src.agents.poi_agent import POIAgent
            agent = POIAgent(places_service=mock_places)
            pois = agent.suggest(_make_trip_context_with_leg(), leg_number=1)

        assert len(pois) == 2
        assert all(isinstance(p, POI) for p in pois)
        assert pois[0].name == "Eiffel Tower"
        assert pois[0].lat == 48.8584
        assert pois[0].claude_note == "The icon of Paris."
        assert pois[0].claude_booking_tip == "Book skip-the-line tickets in advance."

    def test_fallback_when_google_returns_empty(self):
        """When Google Places returns nothing, POI is created from Claude data."""
        mock_claude = _mock_claude_response(_SAMPLE_POI_SUGGESTIONS)
        mock_places = MagicMock()
        mock_places.search_places.return_value = []

        with patch("backend.src.agents.poi_agent.Config") as mock_cfg, \
             patch("backend.src.agents.poi_agent.anthropic.Anthropic", return_value=mock_claude):
            mock_cfg.ANTHROPIC_API_KEY = "test-key"
            from backend.src.agents.poi_agent import POIAgent
            agent = POIAgent(places_service=mock_places)
            pois = agent.suggest(_make_trip_context_with_leg(), leg_number=1)

        assert len(pois) == 2
        assert pois[0].name == "Eiffel Tower"
        assert pois[0].lat == 0.0  # no real data available
        assert pois[0].claude_note == "The icon of Paris."

    def test_returns_empty_on_claude_error(self):
        """When Claude raises an exception, returns empty list."""
        mock_client = MagicMock()
        mock_client.messages.create.side_effect = Exception("API down")
        mock_places = MagicMock()

        with patch("backend.src.agents.poi_agent.Config") as mock_cfg, \
             patch("backend.src.agents.poi_agent.anthropic.Anthropic", return_value=mock_client):
            mock_cfg.ANTHROPIC_API_KEY = "test-key"
            from backend.src.agents.poi_agent import POIAgent
            agent = POIAgent(places_service=mock_places)
            pois = agent.suggest(_make_trip_context_with_leg(), leg_number=1)

        assert pois == []

    def test_uses_correct_model(self):
        """POIAgent calls claude-sonnet-4-6."""
        mock_claude = _mock_claude_response(_SAMPLE_POI_SUGGESTIONS)
        mock_places = MagicMock()
        mock_places.search_places.return_value = []

        with patch("backend.src.agents.poi_agent.Config") as mock_cfg, \
             patch("backend.src.agents.poi_agent.anthropic.Anthropic", return_value=mock_claude):
            mock_cfg.ANTHROPIC_API_KEY = "test-key"
            from backend.src.agents.poi_agent import POIAgent
            agent = POIAgent(places_service=mock_places)
            agent.suggest(_make_trip_context_with_leg(), leg_number=1)

        kwargs = mock_claude.messages.create.call_args.kwargs
        assert kwargs.get("model") == "claude-sonnet-4-6"

    def test_poi_ids_are_populated(self):
        """Every returned POI has a non-empty id."""
        mock_claude = _mock_claude_response(_SAMPLE_POI_SUGGESTIONS)
        mock_places = MagicMock()
        mock_places.search_places.return_value = [_SAMPLE_GOOGLE_PLACE]

        with patch("backend.src.agents.poi_agent.Config") as mock_cfg, \
             patch("backend.src.agents.poi_agent.anthropic.Anthropic", return_value=mock_claude):
            mock_cfg.ANTHROPIC_API_KEY = "test-key"
            from backend.src.agents.poi_agent import POIAgent
            agent = POIAgent(places_service=mock_places)
            pois = agent.suggest(_make_trip_context_with_leg(), leg_number=1)

        for poi in pois:
            assert poi.id, f"POI {poi.name!r} has empty id"


# ---------------------------------------------------------------------------
# ItineraryAgent tests
# ---------------------------------------------------------------------------

_SAMPLE_NARRATIVE = json.dumps({
    "day_1": "Begin your Parisian adventure at the majestic Eiffel Tower before exploring the world-renowned Louvre Museum.",
    "day_2": "Wander the charming streets of Montmartre and soak in the artistic spirit of Paris.",
})


class TestItineraryAgent:
    def test_returns_day_keyed_narratives(self):
        """Returns a dict with day_1, day_2 keys containing narrative strings."""
        mock_claude = _mock_claude_response(_SAMPLE_NARRATIVE)

        with patch("backend.src.agents.itinerary_agent.Config") as mock_cfg, \
             patch("backend.src.agents.itinerary_agent.anthropic.Anthropic", return_value=mock_claude):
            mock_cfg.ANTHROPIC_API_KEY = "test-key"
            from backend.src.agents.itinerary_agent import ItineraryAgent
            agent = ItineraryAgent()
            result = agent.generate(_make_trip_context_with_leg())

        assert "day_1" in result
        assert "day_2" in result
        assert "Eiffel Tower" in result["day_1"]
        assert "Montmartre" in result["day_2"]

    def test_returns_empty_for_no_days(self):
        """TripContext with no day plans returns an empty dict."""
        ctx = TripContext(home_origin="JFK", adults=2)

        with patch("backend.src.agents.itinerary_agent.Config") as mock_cfg, \
             patch("backend.src.agents.itinerary_agent.anthropic.Anthropic") as mock_cls:
            mock_cfg.ANTHROPIC_API_KEY = "test-key"
            from backend.src.agents.itinerary_agent import ItineraryAgent
            agent = ItineraryAgent()
            result = agent.generate(ctx)

        assert result == {}
        mock_cls.return_value.messages.create.assert_not_called()

    def test_fallback_on_claude_error(self):
        """When Claude raises, returns a plain day-summary dict."""
        mock_client = MagicMock()
        mock_client.messages.create.side_effect = Exception("timeout")

        with patch("backend.src.agents.itinerary_agent.Config") as mock_cfg, \
             patch("backend.src.agents.itinerary_agent.anthropic.Anthropic", return_value=mock_client):
            mock_cfg.ANTHROPIC_API_KEY = "test-key"
            from backend.src.agents.itinerary_agent import ItineraryAgent
            agent = ItineraryAgent()
            result = agent.generate(_make_trip_context_with_leg())

        assert "day_1" in result
        assert "day_2" in result
        # Fallback strings include city and date
        assert "Paris" in result["day_1"]

    def test_uses_correct_model(self):
        """ItineraryAgent calls claude-sonnet-4-6."""
        mock_claude = _mock_claude_response(_SAMPLE_NARRATIVE)

        with patch("backend.src.agents.itinerary_agent.Config") as mock_cfg, \
             patch("backend.src.agents.itinerary_agent.anthropic.Anthropic", return_value=mock_claude):
            mock_cfg.ANTHROPIC_API_KEY = "test-key"
            from backend.src.agents.itinerary_agent import ItineraryAgent
            agent = ItineraryAgent()
            agent.generate(_make_trip_context_with_leg())

        kwargs = mock_claude.messages.create.call_args.kwargs
        assert kwargs.get("model") == "claude-sonnet-4-6"

    def test_narrative_values_are_strings(self):
        """All values in the returned dict are plain strings."""
        mock_claude = _mock_claude_response(_SAMPLE_NARRATIVE)

        with patch("backend.src.agents.itinerary_agent.Config") as mock_cfg, \
             patch("backend.src.agents.itinerary_agent.anthropic.Anthropic", return_value=mock_claude):
            mock_cfg.ANTHROPIC_API_KEY = "test-key"
            from backend.src.agents.itinerary_agent import ItineraryAgent
            agent = ItineraryAgent()
            result = agent.generate(_make_trip_context_with_leg())

        for key, value in result.items():
            assert isinstance(value, str), f"{key} value is not a string"
