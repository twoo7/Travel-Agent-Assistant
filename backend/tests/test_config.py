import os
import pytest


def test_config_raises_when_missing_keys(monkeypatch):
    monkeypatch.delenv("AMADEUS_API_KEY", raising=False)
    monkeypatch.delenv("AMADEUS_API_SECRET", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_PLACES_API_KEY", raising=False)

    from backend.src.config import Config
    with pytest.raises(ValueError) as exc_info:
        Config.validate()

    error_msg = str(exc_info.value)
    assert "AMADEUS_API_KEY" in error_msg
    assert "AMADEUS_API_SECRET" in error_msg
    assert "ANTHROPIC_API_KEY" in error_msg
    assert "GOOGLE_PLACES_API_KEY" in error_msg


def test_config_passes_when_all_keys_present(monkeypatch):
    monkeypatch.setenv("AMADEUS_API_KEY", "test_key")
    monkeypatch.setenv("AMADEUS_API_SECRET", "test_secret")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test_anthropic")
    monkeypatch.setenv("GOOGLE_PLACES_API_KEY", "test_google")

    from backend.src.config import Config
    Config.validate()  # should not raise
