import asyncio
import logging
from typing import Any, Dict, List, Optional
import httpx
from backend.src.config import Config
from backend.src.services import redis_service

logger = logging.getLogger(__name__)

PLACES_BASE = "https://places.googleapis.com/v1"
_TTL_PLACES_SUGGEST = 24 * 3600        # 24 hours
_TTL_PLACES_DETAILS = 7 * 24 * 3600   # 7 days

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
        text_query = f"{query} {location_bias}".strip() if location_bias else query
        payload: Dict[str, Any] = {
            "textQuery": text_query,
            "maxResultCount": max_results,
        }

        try:
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
        except httpx.HTTPError as e:
            logger.error("Places API error for query '%s': %s", query, e)
            return []

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
                "photo_urls": _parse_photo_urls(place.get("photos", []), self.api_key),
            })
        return results

    async def async_search_places_cached(
        self,
        query: str,
        location_bias: str = "",
        max_results: int = 10,
        *,
        bypass: bool = False,
    ) -> List[Dict[str, Any]]:
        """Async version of search_places with Redis caching (TTL 24h)."""
        key_params = {
            "q": f"{query} {location_bias}".strip().lower(),
            "n": max_results,
        }
        cache_key = f"cache:places:suggest:{redis_service.hash_params(key_params)}"

        async def fetch() -> list:
            return await asyncio.to_thread(self.search_places, query, location_bias, max_results)

        result = await redis_service.cached_call(
            cache_key, _TTL_PLACES_SUGGEST, fetch, bypass=bypass
        )
        return result or []

    async def async_get_place_details_cached(
        self,
        place_id: str,
        *,
        bypass: bool = False,
    ) -> Dict[str, Any]:
        """Async version of get_place_details with Redis caching (TTL 7d)."""
        cache_key = f"cache:places:details:{place_id.lower()}"

        async def fetch() -> dict:
            return await asyncio.to_thread(self.get_place_details, place_id)

        result = await redis_service.cached_call(
            cache_key, _TTL_PLACES_DETAILS, fetch, bypass=bypass
        )
        return result or {"place_id": place_id}

    def get_place_details(self, place_id: str) -> Dict[str, Any]:
        try:
            resp = httpx.get(
                f"{PLACES_BASE}/places/{place_id}",
                headers={"X-Goog-Api-Key": self.api_key, "X-Goog-FieldMask": FIELD_MASK},
                timeout=10.0,
            )
            resp.raise_for_status()
            place = resp.json()
            return {
                "place_id": place.get("id", place_id),
                "name": place.get("displayName", {}).get("text", ""),
                "address": place.get("formattedAddress", ""),
                "lat": place.get("location", {}).get("latitude", 0.0),
                "lng": place.get("location", {}).get("longitude", 0.0),
                "rating": place.get("rating"),
                "review_count": place.get("userRatingCount"),
                "price_level": _parse_price_level(place.get("priceLevel")),
                "opening_hours": _parse_opening_hours(place.get("currentOpeningHours")),
                "photo_url": _parse_photo_url(place.get("photos", []), self.api_key),
                "photo_urls": _parse_photo_urls(place.get("photos", []), self.api_key),
            }
        except httpx.HTTPError as e:
            logger.error("Places API detail error for %s: %s", place_id, e)
            return {"place_id": place_id}


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


def _parse_photo_urls(photos: List[Dict], api_key: str, max_photos: int = 5) -> Optional[List[str]]:
    if not photos:
        return None
    urls = []
    for photo in photos[:max_photos]:
        name = photo.get("name", "")
        if name:
            urls.append(f"https://places.googleapis.com/v1/{name}/media?maxHeightPx=800&key={api_key}")
    return urls if urls else None
