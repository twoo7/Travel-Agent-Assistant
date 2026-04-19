"""Tests for /trips/* endpoints using fakeredis."""
from __future__ import annotations

import pytest
import pytest_asyncio
import fakeredis.aioredis as fake_aioredis
from fastapi.testclient import TestClient

import backend.src.services.redis_service as redis_svc

USER_A = "user-a-uuid"
USER_B = "user-b-uuid"

_SAMPLE_STATE = {
    "tripContext": {
        "home_origin": "JFK",
        "adults": 2,
        "children": 0,
        "currency": "USD",
        "legs": [],
        "unscheduled_pois": [],
        "saved_pois": [],
    },
    "itinerary": [],
    "staleSteps": [],
    "activeTripId": None,
}


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def patch_redis(monkeypatch: pytest.MonkeyPatch):
    """Replace the Redis client with a fresh fakeredis instance for each test.

    FakeRedis is in-memory with no real connections, so no async teardown needed.
    """
    fake = fake_aioredis.FakeRedis(decode_responses=True)
    monkeypatch.setattr(redis_svc, "_client", fake)
    yield fake


@pytest.fixture
def client_a():
    """TestClient with USER_A identity cookie set."""
    from backend.src.main import app
    c = TestClient(app, raise_server_exceptions=True)
    c.cookies.set("uid", USER_A)
    return c


@pytest.fixture
def client_b():
    """TestClient with USER_B identity cookie set."""
    from backend.src.main import app
    c = TestClient(app, raise_server_exceptions=True)
    c.cookies.set("uid", USER_B)
    return c


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

def test_create_draft(client_a) -> None:
    resp = client_a.post("/trips", json={})
    assert resp.status_code == 201
    data = resp.json()
    assert data["is_draft"] is True
    assert data["trip_id"]
    assert data["name"] == ""


def test_create_named(client_a) -> None:
    resp = client_a.post("/trips", json={"name": "Japan 2026"})
    assert resp.status_code == 201
    data = resp.json()
    assert data["is_draft"] is False
    assert data["name"] == "Japan 2026"


def test_create_with_state(client_a) -> None:
    resp = client_a.post("/trips", json={"state": _SAMPLE_STATE})
    assert resp.status_code == 201
    data = resp.json()
    assert data["state"]["tripContext"]["home_origin"] == "JFK"


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------

def test_list_trips_empty(client_a) -> None:
    resp = client_a.get("/trips")
    assert resp.status_code == 200
    assert resp.json() == []


def test_list_trips_shows_owned(client_a) -> None:
    client_a.post("/trips", json={"name": "Trip 1"})
    client_a.post("/trips", json={"name": "Trip 2"})
    resp = client_a.get("/trips")
    names = {t["name"] for t in resp.json()}
    assert names == {"Trip 1", "Trip 2"}


def test_list_trips_isolated(client_a, client_b) -> None:
    client_a.post("/trips", json={"name": "A's trip"})
    resp = client_b.get("/trips")
    assert resp.json() == []


# ---------------------------------------------------------------------------
# Get
# ---------------------------------------------------------------------------

def test_get_trip(client_a) -> None:
    trip_id = client_a.post("/trips", json={"state": _SAMPLE_STATE}).json()["trip_id"]
    resp = client_a.get(f"/trips/{trip_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["trip_id"] == trip_id
    assert data["state"]["tripContext"]["home_origin"] == "JFK"


def test_get_trip_not_found(client_a) -> None:
    resp = client_a.get("/trips/doesnotexist")
    assert resp.status_code == 404


def test_get_trip_forbidden(client_a, client_b) -> None:
    trip_id = client_a.post("/trips", json={}).json()["trip_id"]
    resp = client_b.get(f"/trips/{trip_id}")
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Save (PUT)
# ---------------------------------------------------------------------------

def test_save_trip(client_a) -> None:
    trip_id = client_a.post("/trips", json={}).json()["trip_id"]
    updated = {**_SAMPLE_STATE, "tripContext": {**_SAMPLE_STATE["tripContext"], "home_origin": "LAX"}}
    resp = client_a.put(f"/trips/{trip_id}", json={"state": updated})
    assert resp.status_code == 200

    # Verify the new state is persisted
    state = client_a.get(f"/trips/{trip_id}").json()["state"]
    assert state["tripContext"]["home_origin"] == "LAX"


def test_save_trip_forbidden(client_a, client_b) -> None:
    trip_id = client_a.post("/trips", json={}).json()["trip_id"]
    resp = client_b.put(f"/trips/{trip_id}", json={"state": _SAMPLE_STATE})
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Patch
# ---------------------------------------------------------------------------

def test_patch_rename(client_a) -> None:
    trip_id = client_a.post("/trips", json={}).json()["trip_id"]
    resp = client_a.patch(f"/trips/{trip_id}", json={"name": "New Name"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Name"


def test_patch_promote_draft(client_a) -> None:
    trip_id = client_a.post("/trips", json={}).json()["trip_id"]
    assert client_a.get(f"/trips/{trip_id}").json()["is_draft"] is True
    client_a.patch(f"/trips/{trip_id}", json={"name": "Summer Europe", "is_draft": False})
    assert client_a.get(f"/trips/{trip_id}").json()["is_draft"] is False


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

def test_delete_trip(client_a) -> None:
    trip_id = client_a.post("/trips", json={}).json()["trip_id"]
    resp = client_a.delete(f"/trips/{trip_id}")
    assert resp.status_code == 204
    assert client_a.get(f"/trips/{trip_id}").status_code == 404


def test_delete_shared_trip_keeps_for_other_owner(client_a, client_b) -> None:
    """When B deletes a claimed trip, A should still see it."""
    trip_id = client_a.post("/trips", json={}).json()["trip_id"]
    client_b.post(f"/trips/{trip_id}/claim")
    client_b.delete(f"/trips/{trip_id}")
    # A still owns it
    assert client_a.get(f"/trips/{trip_id}").status_code == 200
    # B no longer sees it in list
    assert not any(t["trip_id"] == trip_id for t in client_b.get("/trips").json())


# ---------------------------------------------------------------------------
# Claim
# ---------------------------------------------------------------------------

def test_claim_trip(client_a, client_b) -> None:
    trip_id = client_a.post("/trips", json={"name": "Shared"}).json()["trip_id"]
    resp = client_b.post(f"/trips/{trip_id}/claim")
    assert resp.status_code == 200
    # B can now access the trip
    assert client_b.get(f"/trips/{trip_id}").status_code == 200
    # B sees it in their list
    b_trips = client_b.get("/trips").json()
    assert any(t["trip_id"] == trip_id for t in b_trips)


def test_claim_nonexistent_trip(client_b) -> None:
    resp = client_b.post("/trips/doesnotexist/claim")
    assert resp.status_code == 404


def test_trip_meta_updated_at_is_iso_string(client_a) -> None:
    """updated_at must be an ISO 8601 string, not a Unix float."""
    resp = client_a.post("/trips", json={})
    assert resp.status_code == 201
    trip_id = resp.json()["trip_id"]
    list_resp = client_a.get("/trips")
    assert list_resp.status_code == 200
    trip = next(t for t in list_resp.json() if t["trip_id"] == trip_id)
    from datetime import datetime
    dt = datetime.fromisoformat(trip["updated_at"])
    assert dt.year >= 2026
