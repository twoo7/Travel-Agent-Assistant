"""Trips router — save, list, load, and share trip plans.

Redis key layout:
  user:{user_id}:trips          SET<trip_id>         TTL 1y (sliding)
  trip:{trip_id}:meta           HASH                  TTL 1y | 7d for drafts
  trip:{trip_id}:state          STRING(JSON TripState) same TTL

Named trips (is_draft=false) expire after 1 year from last write.
Draft trips expire after 7 days from last write.
"""
from __future__ import annotations

import json
import time
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from backend.src.middleware.identity import get_user_id
from backend.src.services import redis_service

router = APIRouter(prefix="/trips", tags=["trips"])

# Sliding TTLs in seconds
TTL_NAMED = 365 * 24 * 3600   # 1 year
TTL_DRAFT = 7 * 24 * 3600     # 7 days

# nanoid-style short IDs — use secrets module for crypto-safe randomness
import secrets
import string

_ALPHABET = string.ascii_letters + string.digits


def _make_id(length: int = 8) -> str:
    return "".join(secrets.choice(_ALPHABET) for _ in range(length))


def _user_trips_key(user_id: str) -> str:
    return f"user:{user_id}:trips"


def _trip_meta_key(trip_id: str) -> str:
    return f"trip:{trip_id}:meta"


def _trip_state_key(trip_id: str) -> str:
    return f"trip:{trip_id}:state"


def _ttl_for(is_draft: bool) -> int:
    return TTL_DRAFT if is_draft else TTL_NAMED


async def _assert_owner(trip_id: str, user_id: str) -> Dict[str, str]:
    """Return trip meta if user_id is an owner, else raise 404/403."""
    meta = await redis_service.hgetall(_trip_meta_key(trip_id))
    if not meta:
        raise HTTPException(status_code=404, detail="Trip not found")
    owners: List[str] = json.loads(meta.get("owners_json", "[]"))
    if user_id not in owners:
        raise HTTPException(status_code=403, detail="Not authorised to access this trip")
    return meta


async def _refresh_ttl(trip_id: str, is_draft: bool) -> None:
    ttl = _ttl_for(is_draft)
    await redis_service.expire(_trip_meta_key(trip_id), ttl)
    await redis_service.expire(_trip_state_key(trip_id), ttl)


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class CreateTripRequest(BaseModel):
    name: Optional[str] = None
    state: Optional[Dict[str, Any]] = None


class SaveTripRequest(BaseModel):
    state: Dict[str, Any]


class PatchTripRequest(BaseModel):
    name: Optional[str] = None
    is_draft: Optional[bool] = None


class TripMeta(BaseModel):
    trip_id: str
    name: str
    is_draft: bool
    created_at: float
    updated_at: float


class TripDetail(TripMeta):
    state: Optional[Dict[str, Any]] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("", response_model=TripDetail, status_code=201)
async def create_trip(body: CreateTripRequest, request: Request) -> TripDetail:
    """Create a new trip (draft by default).  Returns the trip_id."""
    user_id = get_user_id(request)
    trip_id = _make_id()
    now = time.time()
    is_draft = body.name is None

    meta = {
        "name": body.name or "",
        "owners_json": json.dumps([user_id]),
        "is_draft": str(is_draft).lower(),
        "created_at": str(now),
        "updated_at": str(now),
    }
    ttl = _ttl_for(is_draft)

    await redis_service.hset_mapping(_trip_meta_key(trip_id), meta)
    await redis_service.expire(_trip_meta_key(trip_id), ttl)

    if body.state:
        await redis_service.set_json(_trip_state_key(trip_id), body.state, ttl=ttl)

    await redis_service.sadd(_user_trips_key(user_id), trip_id)
    await redis_service.expire(_user_trips_key(user_id), TTL_NAMED)

    return TripDetail(
        trip_id=trip_id,
        name=meta["name"],
        is_draft=is_draft,
        created_at=now,
        updated_at=now,
        state=body.state,
    )


@router.get("", response_model=List[TripMeta])
async def list_trips(request: Request) -> List[TripMeta]:
    """List all trips belonging to the current user, newest-first."""
    user_id = get_user_id(request)
    trip_ids = await redis_service.smembers(_user_trips_key(user_id))

    trips: List[TripMeta] = []
    for trip_id in trip_ids:
        meta = await redis_service.hgetall(_trip_meta_key(trip_id))
        if not meta:
            # Stale reference — trip expired; clean up the set lazily
            await redis_service.srem(_user_trips_key(user_id), trip_id)
            continue
        trips.append(TripMeta(
            trip_id=trip_id,
            name=meta.get("name", ""),
            is_draft=meta.get("is_draft", "true") == "true",
            created_at=float(meta.get("created_at", 0)),
            updated_at=float(meta.get("updated_at", 0)),
        ))

    trips.sort(key=lambda t: t.updated_at, reverse=True)
    return trips


@router.get("/{trip_id}", response_model=TripDetail)
async def get_trip(trip_id: str, request: Request) -> TripDetail:
    """Return full trip detail including state."""
    user_id = get_user_id(request)
    meta = await _assert_owner(trip_id, user_id)

    state = await redis_service.get_json(_trip_state_key(trip_id))
    is_draft = meta.get("is_draft", "true") == "true"
    await _refresh_ttl(trip_id, is_draft)

    return TripDetail(
        trip_id=trip_id,
        name=meta.get("name", ""),
        is_draft=is_draft,
        created_at=float(meta.get("created_at", 0)),
        updated_at=float(meta.get("updated_at", 0)),
        state=state,
    )


@router.put("/{trip_id}", response_model=TripMeta)
async def save_trip(trip_id: str, body: SaveTripRequest, request: Request) -> TripMeta:
    """Replace the trip state (autosave)."""
    user_id = get_user_id(request)
    meta = await _assert_owner(trip_id, user_id)
    is_draft = meta.get("is_draft", "true") == "true"
    now = time.time()
    ttl = _ttl_for(is_draft)

    await redis_service.set_json(_trip_state_key(trip_id), body.state, ttl=ttl)
    await redis_service.hset_mapping(_trip_meta_key(trip_id), {"updated_at": str(now)})
    await _refresh_ttl(trip_id, is_draft)

    return TripMeta(
        trip_id=trip_id,
        name=meta.get("name", ""),
        is_draft=is_draft,
        created_at=float(meta.get("created_at", 0)),
        updated_at=now,
    )


@router.patch("/{trip_id}", response_model=TripMeta)
async def patch_trip(trip_id: str, body: PatchTripRequest, request: Request) -> TripMeta:
    """Rename a trip and/or promote it from draft → named."""
    user_id = get_user_id(request)
    meta = await _assert_owner(trip_id, user_id)
    now = time.time()

    updates: Dict[str, str] = {"updated_at": str(now)}
    if body.name is not None:
        updates["name"] = body.name
    if body.is_draft is not None:
        updates["is_draft"] = str(body.is_draft).lower()

    await redis_service.hset_mapping(_trip_meta_key(trip_id), updates)
    is_draft_new = updates.get("is_draft", meta.get("is_draft", "true")) == "true"
    await _refresh_ttl(trip_id, is_draft_new)

    return TripMeta(
        trip_id=trip_id,
        name=updates.get("name", meta.get("name", "")),
        is_draft=is_draft_new,
        created_at=float(meta.get("created_at", 0)),
        updated_at=now,
    )


@router.delete("/{trip_id}", status_code=204)
async def delete_trip(trip_id: str, request: Request) -> None:
    """Remove trip from caller's list.  Deletes keys only when last owner."""
    user_id = get_user_id(request)
    meta = await _assert_owner(trip_id, user_id)
    owners: List[str] = json.loads(meta.get("owners_json", "[]"))
    owners = [o for o in owners if o != user_id]

    await redis_service.srem(_user_trips_key(user_id), trip_id)

    if not owners:
        # Last owner — delete the trip entirely
        await redis_service.delete(_trip_meta_key(trip_id))
        await redis_service.delete(_trip_state_key(trip_id))
    else:
        await redis_service.hset_mapping(
            _trip_meta_key(trip_id), {"owners_json": json.dumps(owners)}
        )


@router.post("/{trip_id}/claim", response_model=TripMeta)
async def claim_trip(trip_id: str, request: Request) -> TripMeta:
    """Attach the current user as an additional owner of a shared trip."""
    user_id = get_user_id(request)
    meta = await redis_service.hgetall(_trip_meta_key(trip_id))
    if not meta:
        raise HTTPException(status_code=404, detail="Trip not found")

    owners: List[str] = json.loads(meta.get("owners_json", "[]"))
    if user_id not in owners:
        owners.append(user_id)
        await redis_service.hset_mapping(
            _trip_meta_key(trip_id), {"owners_json": json.dumps(owners)}
        )
        await redis_service.sadd(_user_trips_key(user_id), trip_id)
        await redis_service.expire(_user_trips_key(user_id), TTL_NAMED)

    is_draft = meta.get("is_draft", "true") == "true"
    await _refresh_ttl(trip_id, is_draft)

    return TripMeta(
        trip_id=trip_id,
        name=meta.get("name", ""),
        is_draft=is_draft,
        created_at=float(meta.get("created_at", 0)),
        updated_at=float(meta.get("updated_at", 0)),
    )
