from __future__ import annotations

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse, Response

from backend.src.models.export import ExportRequest
from backend.src.services.export_service import ExportService

router = APIRouter(prefix="/export", tags=["export"])

_service = ExportService()


@router.post("/plan")
def export_plan(
    req: ExportRequest,
    format: str = Query(default="json", pattern="^(json|pdf)$"),
) -> Response:
    if format == "pdf":
        pdf_bytes = _service.generate_pdf(req)
        return Response(content=pdf_bytes, media_type="application/pdf")

    data = _service.generate_json(req)
    return JSONResponse(content=data)
