from __future__ import annotations

import logging
import time

import anthropic

from backend.src.config import Config

logger = logging.getLogger(__name__)

_RETRY_STATUS_CODES = {529}  # overloaded; also catches 529 wrapped in APIStatusError
_MAX_RETRIES = 3
_BASE_DELAY = 5  # seconds


class BaseAgent:
    """Shared Anthropic client with retry logic for transient 529 overload errors."""

    def __init__(self) -> None:
        self.client = anthropic.Anthropic(api_key=Config.ANTHROPIC_API_KEY)

    @staticmethod
    def _extract_json(raw: str) -> str:
        """Strip markdown code fences from a Claude response."""
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return raw

    def _create_with_retry(self, **kwargs) -> anthropic.types.Message:
        """Call messages.create with exponential backoff on 529 overload errors."""
        delay = _BASE_DELAY
        for attempt in range(1, _MAX_RETRIES + 1):
            try:
                return self.client.messages.create(**kwargs)
            except anthropic.APIStatusError as exc:
                if exc.status_code == 529 and attempt < _MAX_RETRIES:
                    logger.warning(
                        "Anthropic API overloaded (529), retry %d/%d in %ds",
                        attempt, _MAX_RETRIES, delay,
                    )
                    time.sleep(delay)
                    delay *= 2
                    continue
                raise
