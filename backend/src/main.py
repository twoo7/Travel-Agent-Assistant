from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.src.config import Config
from backend.src.middleware.identity import IdentityMiddleware
from backend.src.routers import export, flights, hotels, itinerary, pois, segments, trips
from backend.src.services import redis_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    Config.validate()
    await redis_service.connect(Config.REDIS_URL)
    yield
    await redis_service.disconnect()


app = FastAPI(
    title="Travel Agent API",
    description="AI-powered travel planning backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(IdentityMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(flights.router)
app.include_router(hotels.router)
app.include_router(pois.router)
app.include_router(itinerary.router)
app.include_router(export.router)
app.include_router(segments.router)
app.include_router(trips.router)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
