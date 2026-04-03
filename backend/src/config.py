from dotenv import load_dotenv
from pathlib import Path
import os

# Load only from backend/.env to avoid picking up root-level .env files
_backend_env = Path(__file__).parent.parent / ".env"
load_dotenv(dotenv_path=_backend_env)


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
