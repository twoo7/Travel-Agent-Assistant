"""Async Redis service — thin wrapper around redis.asyncio.

A single module-level client is created lazily on first use and shared across
all requests.  Call ``connect()`` / ``disconnect()`` from the FastAPI lifespan
to warm-up and drain the connection pool gracefully.
"""
from __future__ import annotations

import hashlib
import json
import logging
from typing import Any, Awaitable, Callable, Dict, Optional, Set

import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

# Module-level client — set by connect(), cleared by disconnect().
_client: Optional[aioredis.Redis] = None  # type: ignore[type-arg]


async def connect(url: str) -> None:
    """Open the connection pool.  Should be called once at app startup."""
    global _client
    _client = aioredis.Redis.from_url(url, decode_responses=True)
    # Verify connectivity eagerly so misconfiguration surfaces at startup.
    await _client.ping()
    logger.info("Redis connected: %s", url)


async def disconnect() -> None:
    """Drain the connection pool.  Should be called at app shutdown."""
    global _client
    if _client:
        await _client.aclose()
        _client = None
        logger.info("Redis disconnected")


def _require() -> aioredis.Redis:  # type: ignore[type-arg]
    if _client is None:
        raise RuntimeError("Redis client is not connected — call redis_service.connect() first")
    return _client


# ---------------------------------------------------------------------------
# Core key/value helpers
# ---------------------------------------------------------------------------

async def get_json(key: str) -> Optional[Dict[str, Any]]:
    raw = await _require().get(key)
    if raw is None:
        return None
    try:
        return json.loads(raw)  # type: ignore[no-any-return]
    except json.JSONDecodeError:
        logger.warning("Redis key %s contained invalid JSON — treating as miss", key)
        return None


async def set_json(key: str, value: Any, ttl: Optional[int] = None) -> None:
    r = _require()
    serialised = json.dumps(value, default=str)
    if ttl:
        await r.setex(key, ttl, serialised)
    else:
        await r.set(key, serialised)


async def delete(key: str) -> None:
    await _require().delete(key)


async def expire(key: str, ttl: int) -> None:
    await _require().expire(key, ttl)


# ---------------------------------------------------------------------------
# Set helpers (used for user→trips membership)
# ---------------------------------------------------------------------------

async def sadd(key: str, *members: str) -> None:
    await _require().sadd(key, *members)


async def srem(key: str, *members: str) -> None:
    await _require().srem(key, *members)


async def smembers(key: str) -> Set[str]:
    return await _require().smembers(key)  # type: ignore[return-value]


async def sismember(key: str, member: str) -> bool:
    return bool(await _require().sismember(key, member))


# ---------------------------------------------------------------------------
# Hash helpers (used for trip metadata)
# ---------------------------------------------------------------------------

async def hset_mapping(key: str, mapping: Dict[str, Any]) -> None:
    # Convert all values to strings for storage
    str_mapping = {k: str(v) for k, v in mapping.items()}
    await _require().hset(key, mapping=str_mapping)


async def hgetall(key: str) -> Dict[str, str]:
    return await _require().hgetall(key)  # type: ignore[return-value]


async def exists(key: str) -> bool:
    return bool(await _require().exists(key))


# ---------------------------------------------------------------------------
# Caching helper
# ---------------------------------------------------------------------------

async def cached_call(
    key: str,
    ttl: int,
    fetch_fn: Callable[[], Awaitable[Any]],
    *,
    bypass: bool = False,
) -> Any:
    """Return cached value for *key* if present; otherwise call *fetch_fn*,
    store the result under *key* with *ttl* seconds, and return it.

    Pass ``bypass=True`` to skip the cache and always call *fetch_fn*
    (the fresh result still overwrites the cache).
    """
    if not bypass:
        cached = await get_json(key)
        if cached is not None:
            logger.debug("Cache hit: %s", key)
            return cached

    logger.debug("Cache miss: %s", key)
    result = await fetch_fn()
    if result is not None:
        await set_json(key, result, ttl=ttl)
    return result


# ---------------------------------------------------------------------------
# Key-building utilities
# ---------------------------------------------------------------------------

def hash_params(params: Dict[str, Any]) -> str:
    """Return first-16-chars of sha256 of a stable JSON serialisation of *params*."""
    stable = json.dumps(params, sort_keys=True, default=str)
    return hashlib.sha256(stable.encode()).hexdigest()[:16]
