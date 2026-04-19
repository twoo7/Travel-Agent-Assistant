"""Tests for redis_service using fakeredis — no live Redis required."""
from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock

import pytest
import pytest_asyncio
import fakeredis.aioredis as fake_aioredis

import backend.src.services.redis_service as svc


# ---------------------------------------------------------------------------
# Fixture: patch module-level _client with a fakeredis instance
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture()
async def fake_redis(monkeypatch: pytest.MonkeyPatch):
    """Replace the module-level Redis client with a fresh fakeredis for each test."""
    fake = fake_aioredis.FakeRedis(decode_responses=True)
    monkeypatch.setattr(svc, "_client", fake)
    yield fake


# ---------------------------------------------------------------------------
# get_json / set_json
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_set_and_get_json(fake_redis) -> None:
    await svc.set_json("mykey", {"foo": 1, "bar": [1, 2]})
    result = await svc.get_json("mykey")
    assert result == {"foo": 1, "bar": [1, 2]}


@pytest.mark.asyncio
async def test_get_json_missing_returns_none(fake_redis) -> None:
    result = await svc.get_json("nonexistent")
    assert result is None


@pytest.mark.asyncio
async def test_set_json_with_ttl(fake_redis) -> None:
    await svc.set_json("ttlkey", {"x": 1}, ttl=3600)
    result = await svc.get_json("ttlkey")
    assert result == {"x": 1}
    ttl = await svc._require().ttl("ttlkey")
    assert 0 < ttl <= 3600


@pytest.mark.asyncio
async def test_delete(fake_redis) -> None:
    await svc.set_json("delkey", {"v": 42})
    await svc.delete("delkey")
    assert await svc.get_json("delkey") is None


# ---------------------------------------------------------------------------
# Set helpers
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_sadd_smembers(fake_redis) -> None:
    await svc.sadd("myset", "a", "b", "c")
    members = await svc.smembers("myset")
    assert members == {"a", "b", "c"}


@pytest.mark.asyncio
async def test_srem(fake_redis) -> None:
    await svc.sadd("myset2", "x", "y")
    await svc.srem("myset2", "x")
    members = await svc.smembers("myset2")
    assert members == {"y"}


@pytest.mark.asyncio
async def test_sismember(fake_redis) -> None:
    await svc.sadd("myset3", "hello")
    assert await svc.sismember("myset3", "hello") is True
    assert await svc.sismember("myset3", "world") is False


# ---------------------------------------------------------------------------
# Hash helpers
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_hset_hgetall(fake_redis) -> None:
    await svc.hset_mapping("myhash", {"name": "Japan Trip", "is_draft": "false"})
    result = await svc.hgetall("myhash")
    assert result["name"] == "Japan Trip"
    assert result["is_draft"] == "false"


# ---------------------------------------------------------------------------
# cached_call
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_cached_call_miss_then_hit(fake_redis) -> None:
    call_count = 0

    async def fetch_fn():
        nonlocal call_count
        call_count += 1
        return {"data": "fresh"}

    result1 = await svc.cached_call("ckey", 3600, fetch_fn)
    assert result1 == {"data": "fresh"}
    assert call_count == 1

    result2 = await svc.cached_call("ckey", 3600, fetch_fn)
    assert result2 == {"data": "fresh"}
    assert call_count == 1  # still only fetched once


@pytest.mark.asyncio
async def test_cached_call_bypass(fake_redis) -> None:
    values = [{"data": "v1"}, {"data": "v2"}]
    idx = 0

    async def fetch_fn():
        nonlocal idx
        v = values[idx]
        idx += 1
        return v

    await svc.cached_call("bkey", 3600, fetch_fn)
    result = await svc.cached_call("bkey", 3600, fetch_fn, bypass=True)
    assert result == {"data": "v2"}


@pytest.mark.asyncio
async def test_cached_call_none_result_not_stored(fake_redis) -> None:
    async def fetch_fn():
        return None

    result = await svc.cached_call("nonekey", 3600, fetch_fn)
    assert result is None
    assert await svc.get_json("nonekey") is None


# ---------------------------------------------------------------------------
# hash_params — pure functions, no Redis needed
# ---------------------------------------------------------------------------

def test_hash_params_stable() -> None:
    h1 = svc.hash_params({"a": 1, "b": 2})
    h2 = svc.hash_params({"b": 2, "a": 1})
    assert h1 == h2
    assert len(h1) == 16


def test_hash_params_different_inputs() -> None:
    h1 = svc.hash_params({"origin": "JFK", "dest": "NRT"})
    h2 = svc.hash_params({"origin": "JFK", "dest": "CDG"})
    assert h1 != h2


# ---------------------------------------------------------------------------
# _require raises without client
# ---------------------------------------------------------------------------

def test_require_raises_without_client(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(svc, "_client", None)
    with pytest.raises(RuntimeError, match="not connected"):
        svc._require()
