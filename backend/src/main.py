from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.src.routers import export, flights, hotels, itinerary, pois

app = FastAPI(
    title="Travel Agent API",
    description="AI-powered travel planning backend",
    version="1.0.0",
)

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


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}
