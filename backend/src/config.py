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
    AMADEUS_API_KEY: str = os.getenv("AMADEUS_API_KEY", "")
    AMADEUS_API_SECRET: str = os.getenv("AMADEUS_API_SECRET", "")
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    GOOGLE_PLACES_API_KEY: str = os.getenv("GOOGLE_PLACES_API_KEY", "")
    GOOGLE_MAPS_API_KEY: str = os.getenv("GOOGLE_MAPS_API_KEY", "")

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
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")
