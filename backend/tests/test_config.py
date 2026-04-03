import os
import pytest


def test_config_raises_when_missing_keys(monkeypatch):
    monkeypatch.delenv("AMADEUS_API_KEY", raising=False)
    monkeypatch.delenv("AMADEUS_API_SECRET", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_PLACES_API_KEY", raising=False)

    import importlib
    import backend.src.config as cfg
    importlib.reload(cfg)

    with pytest.raises(ValueError, match="AMADEUS_API_KEY"):
        cfg.Config.validate()


def test_config_passes_when_all_keys_present(monkeypatch):
    monkeypatch.setenv("AMADEUS_API_KEY", "test_key")
    monkeypatch.setenv("AMADEUS_API_SECRET", "test_secret")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test_anthropic")
    monkeypatch.setenv("GOOGLE_PLACES_API_KEY", "test_google")

    import importlib
    import backend.src.config as cfg
    importlib.reload(cfg)

    cfg.Config.validate()  # should not raise
