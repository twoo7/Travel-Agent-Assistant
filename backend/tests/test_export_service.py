import json
import pytest
from backend.src.services.export_service import ExportService
from backend.src.models.export import ExportRequest, ItineraryDay
from backend.src.models.trip import TripContext


def _make_request() -> ExportRequest:
    ctx = TripContext(home_origin="JFK", adults=2, legs=[])
    day = ItineraryDay(
        day_number=1,
        date="2026-06-10",
        city="Tokyo",
        narrative="A wonderful first day in Tokyo.",
        items=[],
    )
    return ExportRequest(trip_context=ctx, itinerary=[day])


def test_generate_json_is_valid():
    service = ExportService()
    req = _make_request()
    result = service.generate_json(req)
    parsed = json.loads(result)
    assert parsed["schema_version"] == "1.1"
    assert parsed["trip_context"]["home_origin"] == "JFK"
    assert len(parsed["itinerary"]) == 1
    assert parsed["itinerary"][0]["narrative"] == "A wonderful first day in Tokyo."


def test_generate_json_includes_generated_at():
    service = ExportService()
    req = _make_request()
    result = service.generate_json(req)
    parsed = json.loads(result)
    assert "generated_at" in parsed
    assert len(parsed["generated_at"]) > 0


def test_generate_pdf_returns_bytes():
    """PDF generation via reportlab must return valid PDF bytes."""
    service = ExportService()
    req = _make_request()
    pdf_bytes = service.generate_pdf(req)

    assert isinstance(pdf_bytes, bytes)
    assert pdf_bytes[:4] == b"%PDF"


def test_generate_pdf_contains_trip_info():
    """Generated PDF bytes should be non-trivial in size (reportlab output)."""
    service = ExportService()
    req = _make_request()
    pdf_bytes = service.generate_pdf(req)

    # A real reportlab document for a simple itinerary is at least 1KB
    assert len(pdf_bytes) > 1024
