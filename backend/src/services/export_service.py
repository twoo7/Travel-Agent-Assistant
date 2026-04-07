import html as html_lib
import json
import logging
from datetime import datetime, timezone
from backend.src.models.export import ExportPlan, ExportRequest

logger = logging.getLogger(__name__)


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
        html = _build_html(request)
        return self._render_pdf(html)

    def _render_pdf(self, html: str) -> bytes:
        try:
            from weasyprint import HTML  # lazy import — fails gracefully on Windows without GTK
            return HTML(string=html).write_pdf()
        except (OSError, ImportError) as e:
            raise RuntimeError(
                f"WeasyPrint is not available: {e}. "
                "On Windows, install GTK runtime. On Linux, run: pip install weasyprint"
            ) from e


def _build_html(request: ExportRequest) -> str:
    ctx = request.trip_context
    legs_summary = ""
    for leg in ctx.legs:
        flight_info = ""
        if leg.selected_flight:
            f = leg.selected_flight
            seg = f.segments[0]
            flight_info = (
                f"<p>✈ {html_lib.escape(seg.departure_airport)} → {html_lib.escape(seg.arrival_airport)}"
                f" · {html_lib.escape(str(f.price))} {html_lib.escape(f.currency)}</p>"
            )
        stays = "".join(
            f"<p>🏨 {html_lib.escape(s.hotel.name)} ({html_lib.escape(s.check_in)} – {html_lib.escape(s.check_out)})</p>"
            for s in leg.hotel_stays
        )
        legs_summary += (
            f"<div class='leg'>"
            f"<h3>Leg {html_lib.escape(str(leg.leg_number))}: {html_lib.escape(leg.origin)} → {html_lib.escape(leg.destination)}</h3>"
            f"{flight_info}{stays}"
            f"</div>"
        )

    _mode_icons = {"flight": "✈", "train": "🚂", "ferry": "⛴", "car": "🚗"}
    segments_html = ""
    for seg in request.transport_segments:
        icon = _mode_icons.get(seg.mode, "🚌")
        duration_str = ""
        if seg.duration_mins is not None:
            h, m = divmod(seg.duration_mins, 60)
            duration_str = f"{h}h {m}m" if h else f"{m}m"
        operator_part = (
            f"Operator: {html_lib.escape(seg.operator)} | " if seg.operator else ""
        )
        duration_part = f"Duration: {html_lib.escape(duration_str)} | " if duration_str else ""
        booking_part = (
            f'<a href="{html_lib.escape(seg.booking_link)}">Book online ↗</a>'
            if seg.booking_link
            else ""
        )
        segments_html += (
            f"<div class='leg'>"
            f"<strong>{html_lib.escape(icon)} Leg {html_lib.escape(str(seg.leg_number))}: "
            f"{html_lib.escape(seg.origin)} → {html_lib.escape(seg.destination)} "
            f"({html_lib.escape(seg.mode)})</strong>"
            f"<p>{operator_part}{duration_part}{booking_part}</p>"
            f"</div>"
        )

    days_html = ""
    for day in request.itinerary:
        items_html = "".join(
            "<li>"
            + html_lib.escape(item.name)
            + f" — {html_lib.escape(item.address)}"
            + (f" ({html_lib.escape(str(item.duration_mins))} min)" if item.duration_mins else "")
            + (
                f" <span class='distance'>{html_lib.escape(str(item.travel_time_to_next_mins))} min"
                f" · {html_lib.escape(str(item.distance_to_next_km))} km →</span>"
                if item.distance_to_next_km
                else ""
            )
            + "</li>"
            for item in day.items
        )
        days_html += (
            f"<div class='day'>"
            f"<h3>Day {html_lib.escape(str(day.day_number))} — {html_lib.escape(day.date)} · {html_lib.escape(day.city)}</h3>"
            f"<p class='narrative'>{html_lib.escape(day.narrative)}</p>"
            f"<ul>{items_html}</ul>"
            f"</div>"
        )

    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset='utf-8'>
<style>
  body {{ font-family: Georgia, serif; max-width: 800px; margin: 40px auto; color: #333; }}
  h1 {{ color: #1a1a2e; }}
  h2 {{ color: #16213e; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; }}
  h3 {{ color: #0f3460; }}
  .leg {{ background: #f8f9fa; padding: 12px; border-radius: 4px; margin: 8px 0; }}
  .day {{ margin: 24px 0; }}
  .narrative {{ font-style: italic; color: #555; }}
  .distance {{ color: #888; font-size: 0.85em; }}
  ul {{ list-style: none; padding: 0; }}
  li {{ padding: 4px 0; border-bottom: 1px solid #eee; }}
</style>
</head>
<body>
<h1>Trip Plan</h1>
<p>{html_lib.escape(str(ctx.adults))} adults{f' + {html_lib.escape(str(ctx.children))} children' if ctx.children else ''} · Departing from {html_lib.escape(ctx.home_origin)}</p>
<h2>Flight &amp; Hotel Summary</h2>
{legs_summary}
<h2>Transport Segments</h2>
{segments_html}
<h2>Itinerary</h2>
{days_html}
<p style='color:#aaa;font-size:0.8em;margin-top:40px;'>Generated by Travel Agent Assistant</p>
</body>
</html>"""
