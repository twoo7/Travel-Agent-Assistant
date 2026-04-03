import logging
from typing import Any, Dict, List, Optional
import httpx
from backend.src.config import Config

logger = logging.getLogger(__name__)

PLACES_BASE = "https://places.googleapis.com/v1"
FIELD_MASK = (
    "places.id,places.displayName,places.formattedAddress,places.location,"
    "places.rating,places.userRatingCount,places.priceLevel,"
    "places.currentOpeningHours,places.regularOpeningHours,"
    "places.photos,places.websiteUri"
)


class GooglePlacesService:
    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or Config.GOOGLE_PLACES_API_KEY

    def search_places(
        self, query: str, location_bias: str = "", max_results: int = 10
    ) -> List[Dict[str, Any]]:
        payload: Dict[str, Any] = {
            "textQuery": query,
            "maxResultCount": max_results,
        }

        resp = httpx.post(
            f"{PLACES_BASE}/places:searchText",
            json=payload,
            headers={
                "X-Goog-Api-Key": self.api_key,
                "X-Goog-FieldMask": FIELD_MASK,
            },
            timeout=10.0,
        )
        resp.raise_for_status()
        data = resp.json()

        results = []
        for place in data.get("places", []):
            results.append({
                "place_id": place["id"],
                "name": place["displayName"]["text"],
                "address": place.get("formattedAddress", ""),
                "lat": place["location"]["latitude"],
                "lng": place["location"]["longitude"],
                "rating": place.get("rating"),
                "review_count": place.get("userRatingCount"),
                "price_level": _parse_price_level(place.get("priceLevel")),
                "opening_hours": _parse_opening_hours(place.get("currentOpeningHours")),
                "photo_url": _parse_photo_url(place.get("photos", []), self.api_key),
            })
        return results

    def get_place_details(self, place_id: str) -> Dict[str, Any]:
        resp = httpx.get(
            f"{PLACES_BASE}/places/{place_id}",
            headers={
                "X-Goog-Api-Key": self.api_key,
                "X-Goog-FieldMask": FIELD_MASK,
            },
            timeout=10.0,
        )
        resp.raise_for_status()
        return resp.json()


def _parse_price_level(level: Optional[str]) -> Optional[int]:
    mapping = {
        "PRICE_LEVEL_FREE": 0,
        "PRICE_LEVEL_INEXPENSIVE": 1,
        "PRICE_LEVEL_MODERATE": 2,
        "PRICE_LEVEL_EXPENSIVE": 3,
        "PRICE_LEVEL_VERY_EXPENSIVE": 4,
    }
    return mapping.get(level) if level else None


def _parse_opening_hours(hours_data: Optional[Dict]) -> Optional[str]:
    if not hours_data:
        return None
    descriptions = hours_data.get("weekdayDescriptions", [])
    return "; ".join(descriptions) if descriptions else None


def _parse_photo_url(photos: List[Dict], api_key: str) -> Optional[str]:
    if not photos:
        return None
    name = photos[0].get("name", "")
    return f"https://places.googleapis.com/v1/{name}/media?maxHeightPx=400&key={api_key}"
