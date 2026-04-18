from dotenv import load_dotenv
from pathlib import Path
import os

# Load only from backend/.env to avoid picking up root-level .env files.
# Skip when running under pytest (PYTEST_CURRENT_TEST is set by pytest automatically)
# so that test monkeypatches that clear env vars are not overwritten by load_dotenv.
_backend_env = Path(__file__).parent.parent / ".env"
if not os.getenv("PYTEST_CURRENT_TEST"):
    load_dotenv(dotenv_path=_backend_env, override=False)


class Config:
    # Class attributes default to empty; call validate() at startup to populate
    # them from the current environment (ensures fresh values, not import-time snapshots).
    AMADEUS_API_KEY: str = ""
    AMADEUS_API_SECRET: str = ""
    ANTHROPIC_API_KEY: str = ""
    GOOGLE_PLACES_API_KEY: str = ""
    GOOGLE_MAPS_API_KEY: str = ""
    # Redis — optional, defaults to local instance.
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    # Read at class-definition time so it's available before validate() is called.
    # Not in the required list — defaults to False (production-safe).
    AMADEUS_MOCK: bool = os.getenv("AMADEUS_MOCK", "false").lower() == "true"

    @classmethod
    def validate(cls) -> None:
        required = [
            "AMADEUS_API_KEY",
            "AMADEUS_API_SECRET",
            "ANTHROPIC_API_KEY",
            "GOOGLE_PLACES_API_KEY",
        ]
        missing = [k for k in required if not os.getenv(k)]
        if missing:
            raise ValueError(
                f"Missing required environment variables: {', '.join(missing)}. "
                "Set them in backend/.env"
            )
        # Refresh class attributes from current environment so that any code
        # reading Config.AMADEUS_API_KEY etc. gets the value present at the
        # time validate() was called, not the stale import-time value.
        cls.AMADEUS_API_KEY = os.getenv("AMADEUS_API_KEY", "")
        cls.AMADEUS_API_SECRET = os.getenv("AMADEUS_API_SECRET", "")
        cls.ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
        cls.GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")
        cls.GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")
        cls.REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        cls.AMADEUS_MOCK = os.getenv("AMADEUS_MOCK", "false").lower() == "true"
