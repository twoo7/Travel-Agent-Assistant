import json
import pytest
from unittest.mock import patch, MagicMock
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
    """Test PDF generation with WeasyPrint mocked (Windows-safe)."""
    mock_pdf_bytes = b"%PDF-1.4 mock pdf content"

    with patch("backend.src.services.export_service.ExportService._render_pdf") as mock_render:
        mock_render.return_value = mock_pdf_bytes
        service = ExportService()
        req = _make_request()
        pdf_bytes = service.generate_pdf(req)

    assert isinstance(pdf_bytes, bytes)
    assert pdf_bytes == mock_pdf_bytes


def test_generate_pdf_raises_on_weasyprint_unavailable():
    """On Windows, WeasyPrint cannot be imported — generate_pdf should raise RuntimeError."""
    with patch("backend.src.services.export_service.ExportService._render_pdf",
               side_effect=RuntimeError("WeasyPrint requires GTK on Windows")):
        service = ExportService()
        req = _make_request()
        with pytest.raises(RuntimeError, match="WeasyPrint"):
            service.generate_pdf(req)
