import io
import logging
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer

from backend.src.models.export import ExportPlan, ExportRequest

logger = logging.getLogger(__name__)

_MARGIN = 20 * mm


class ExportService:
    def generate_json(self, request: ExportRequest) -> str:
        plan = ExportPlan(
            trip_context=request.trip_context,
            itinerary=request.itinerary,
            transport_segments=request.transport_segments,
            generated_at=datetime.now(timezone.utc).isoformat(),
        )
        return plan.model_dump_json(indent=2)

    def generate_pdf(self, request: ExportRequest) -> bytes:
        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=A4,
            leftMargin=_MARGIN,
            rightMargin=_MARGIN,
            topMargin=_MARGIN,
            bottomMargin=_MARGIN,
        )
        styles = getSampleStyleSheet()
        h1 = styles["h1"]
        h2 = styles["h2"]
        h3 = styles["h3"]
        normal = styles["Normal"]
        italic = ParagraphStyle(
            "italic",
            parent=normal,
            fontName="Helvetica-Oblique",
            textColor=colors.HexColor("#555555"),
        )
        footer_style = ParagraphStyle(
            "footer",
            parent=normal,
            fontSize=8,
            textColor=colors.HexColor("#aaaaaa"),
        )

        ctx = request.trip_context
        story = []

        story.append(Paragraph("Trip Plan", h1))
        passengers = f"{ctx.adults} adult{'s' if ctx.adults != 1 else ''}"
        if ctx.children:
            passengers += f" + {ctx.children} child{'ren' if ctx.children != 1 else ''}"
        story.append(Paragraph(f"{passengers} - Departing from {ctx.home_origin}", normal))
        story.append(Spacer(1, 6 * mm))

        if ctx.legs:
            story.append(Paragraph("Flight and Hotel Summary", h2))
            story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e0e0e0")))
            story.append(Spacer(1, 3 * mm))
            for leg in ctx.legs:
                story.append(Paragraph(f"Leg {leg.leg_number}: {leg.origin} to {leg.destination}", h3))
                if leg.selected_flight:
                    f = leg.selected_flight
                    seg = f.segments[0] if f.segments else None
                    if seg:
                        story.append(
                            Paragraph(
                                f"Flight: {seg.departure_airport} to {seg.arrival_airport} - {f.price} {f.currency}",
                                normal,
                            )
                        )
                for stay in leg.hotel_stays:
                    story.append(
                        Paragraph(f"Hotel: {stay.hotel.name} ({stay.check_in} to {stay.check_out})", normal)
                    )
                story.append(Spacer(1, 3 * mm))

        if request.transport_segments:
            story.append(Paragraph("Transport Segments", h2))
            story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e0e0e0")))
            story.append(Spacer(1, 3 * mm))
            mode_labels = {"flight": "Flight", "train": "Train", "ferry": "Ferry", "car": "Car"}
            for seg in request.transport_segments:
                mode = mode_labels.get(seg.mode, seg.mode.capitalize())
                parts = [f"{mode} - Leg {seg.leg_number}: {seg.origin} to {seg.destination}"]
                if seg.operator:
                    parts.append(f"Operator: {seg.operator}")
                if seg.duration_mins is not None:
                    h, m = divmod(seg.duration_mins, 60)
                    parts.append(f"Duration: {h}h {m}m" if h else f"Duration: {m}m")
                story.append(Paragraph(" | ".join(parts), normal))
                story.append(Spacer(1, 2 * mm))

        if request.itinerary:
            story.append(Paragraph("Itinerary", h2))
            story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e0e0e0")))
            story.append(Spacer(1, 3 * mm))
            for day in request.itinerary:
                story.append(Paragraph(f"Day {day.day_number} - {day.date} - {day.city}", h3))
                if day.narrative:
                    story.append(Paragraph(day.narrative, italic))
                for item in day.items:
                    line = f"- {item.name}"
                    if item.address:
                        line += f" ({item.address})"
                    if item.duration_mins:
                        line += f" [{item.duration_mins} min]"
                    story.append(Paragraph(line, normal))
                story.append(Spacer(1, 4 * mm))

        story.append(Spacer(1, 8 * mm))
        story.append(
            Paragraph(
                f"Generated by Travel Agent Assistant - {datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
                footer_style,
            )
        )

        doc.build(story)
        return buf.getvalue()
