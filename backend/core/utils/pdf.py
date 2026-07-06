import io
import os

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet

NAVY = colors.HexColor("#0F3D63")
LIGHT_BLUE = colors.HexColor("#EAF2FB")
GREY = colors.HexColor("#555555")

# Helvetica (ReportLab's default) has no glyph for the Rupee sign (₹), which
# renders as a black box on invoices for an Indian business. DejaVu Sans
# ships on most Linux systems and includes full Unicode currency coverage,
# so we register it and use it everywhere instead of Helvetica.
_FONT_REGULAR = "Helvetica"
_FONT_BOLD = "Helvetica-Bold"

_DEJAVU_REGULAR_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
_DEJAVU_BOLD_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

if os.path.exists(_DEJAVU_REGULAR_PATH) and os.path.exists(_DEJAVU_BOLD_PATH):
    pdfmetrics.registerFont(TTFont("DejaVuSans", _DEJAVU_REGULAR_PATH))
    pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", _DEJAVU_BOLD_PATH))
    _FONT_REGULAR = "DejaVuSans"
    _FONT_BOLD = "DejaVuSans-Bold"


def _styles():
    base = getSampleStyleSheet()
    base.add(ParagraphStyle(name="CompanyName", fontSize=18, leading=22, textColor=NAVY, fontName=_FONT_BOLD))
    base.add(ParagraphStyle(name="DocTitle", fontSize=14, leading=18, textColor=NAVY, fontName=_FONT_BOLD, alignment=2))
    base.add(ParagraphStyle(name="SmallGrey", fontSize=9, leading=12, textColor=GREY, fontName=_FONT_REGULAR))
    base.add(ParagraphStyle(name="SectionHead", fontSize=11, leading=14, textColor=NAVY, fontName=_FONT_BOLD, spaceBefore=10, spaceAfter=4))
    base.add(ParagraphStyle(name="Body", fontSize=10, leading=14, fontName=_FONT_REGULAR))
    # Override the built-in Normal/Title styles too, since Paragraph() calls
    # elsewhere may implicitly rely on them having Unicode-safe fonts.
    base["Normal"].fontName = _FONT_REGULAR
    base["Title"].fontName = _FONT_BOLD
    return base


def build_invoice_pdf(rental, settings_obj) -> bytes:
    """Generates a professional invoice PDF for a closed/active rental."""
    styles = _styles()
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=18 * mm, bottomMargin=18 * mm, leftMargin=16 * mm, rightMargin=16 * mm,
    )
    elements = []

    header_data = [[
        Paragraph(settings_obj.company_name, styles["CompanyName"]),
        Paragraph("INVOICE", styles["DocTitle"]),
    ]]
    header_table = Table(header_data, colWidths=[100 * mm, 78 * mm])
    header_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    elements.append(header_table)

    contact_bits = [settings_obj.company_address, settings_obj.company_phone, settings_obj.company_email]
    contact_line = " | ".join([b for b in contact_bits if b])
    if contact_line:
        elements.append(Paragraph(contact_line, styles["SmallGrey"]))
    elements.append(Spacer(1, 10))

    meta_data = [
        ["Invoice No:", rental.invoice_number, "Date:", rental.closed_at.strftime("%d %b %Y") if rental.closed_at else rental.created_at.strftime("%d %b %Y")],
        ["Customer:", rental.customer.full_name, "Phone:", rental.customer.phone],
        ["Status:", rental.get_status_display(), "", ""],
    ]
    meta_table = Table(meta_data, colWidths=[26 * mm, 58 * mm, 24 * mm, 70 * mm])
    meta_table.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, -1), _FONT_REGULAR),
        ("FONTNAME", (0, 0), (0, -1), _FONT_BOLD),
        ("FONTNAME", (2, 0), (2, -1), _FONT_BOLD),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 6))

    vehicle_line = f"<b>Vehicle:</b> {rental.vehicle.registration_number} ({rental.vehicle.make} {rental.vehicle.model})"
    elements.append(Paragraph(vehicle_line, styles["Body"]))
    elements.append(Spacer(1, 14))

    elements.append(Paragraph("Trip Details", styles["SectionHead"]))
    trip_data = [
        ["Scheduled Start", rental.scheduled_start.strftime("%d %b %Y, %I:%M %p")],
        ["Scheduled End", rental.scheduled_end.strftime("%d %b %Y, %I:%M %p")],
        ["Actual Start", rental.actual_start.strftime("%d %b %Y, %I:%M %p") if rental.actual_start else "-"],
        ["Actual End", rental.actual_end.strftime("%d %b %Y, %I:%M %p") if rental.actual_end else "-"],
        ["Destination / Purpose", f"{rental.destination or '-'} / {rental.purpose or '-'}"],
        ["KM Covered", str(rental.km_covered()) if rental.km_covered() is not None else "-"],
    ]
    trip_table = Table(trip_data, colWidths=[55 * mm, 123 * mm])
    trip_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("FONTNAME", (0, 0), (-1, -1), _FONT_REGULAR),
        ("FONTNAME", (0, 0), (0, -1), _FONT_BOLD),
        ("BACKGROUND", (0, 0), (0, -1), LIGHT_BLUE),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD8E8")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
    ]))
    elements.append(trip_table)
    elements.append(Spacer(1, 14))

    elements.append(Paragraph("Charges", styles["SectionHead"]))
    sym = settings_obj.currency_symbol
    charge_rows = [["Description", "Amount"]]
    charge_rows.append(["Base Rental Charge", f"{sym}{rental.base_amount}"])
    if rental.late_fee_amount and rental.late_fee_amount > 0:
        fee_type = rental.late_fee_type
        label = f"Late Return Fee — {fee_type}" if fee_type else "Late Return Fee"
        charge_rows.append([label, f"{sym}{rental.late_fee_amount}"])
    if rental.extra_km_amount and rental.extra_km_amount > 0:
        charge_rows.append(["Extra KM Charge", f"{sym}{rental.extra_km_amount}"])
    if rental.damage_charge_amount and rental.damage_charge_amount > 0:
        charge_rows.append(["Damage Charge", f"{sym}{rental.damage_charge_amount}"])
    charge_rows.append([f"GST ({rental.gst_percent_snapshot}%)", f"{sym}{rental.gst_amount}"])
    charge_rows.append(["TOTAL", f"{sym}{rental.total_amount}"])
    charge_rows.append(["Amount Paid", f"{sym}{rental.amount_paid}"])
    if rental.balance_due < 0:
        charge_rows.append(["Refund Due to Customer", f"{sym}{abs(rental.balance_due)}"])
    else:
        charge_rows.append(["Balance Due", f"{sym}{rental.balance_due}"])

    charge_table = Table(charge_rows, colWidths=[123 * mm, 55 * mm])
    style_cmds = [
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("FONTNAME", (0, 0), (-1, -1), _FONT_REGULAR),
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), _FONT_BOLD),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD8E8")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
    ]
    total_row_idx = len(charge_rows) - 3
    style_cmds.append(("FONTNAME", (0, total_row_idx), (-1, total_row_idx), _FONT_BOLD))
    style_cmds.append(("BACKGROUND", (0, total_row_idx), (-1, total_row_idx), LIGHT_BLUE))
    charge_table.setStyle(TableStyle(style_cmds))
    elements.append(charge_table)
    elements.append(Spacer(1, 16))

    if settings_obj.invoice_terms:
        elements.append(Paragraph("Terms & Conditions", styles["SectionHead"]))
        for line in settings_obj.invoice_terms.split("\n"):
            if line.strip():
                elements.append(Paragraph(line.strip(), styles["SmallGrey"]))
        elements.append(Spacer(1, 10))

    if settings_obj.invoice_footer_note:
        elements.append(Paragraph(settings_obj.invoice_footer_note, styles["Body"]))

    doc.build(elements)
    return buffer.getvalue()


def build_agreement_pdf(rental, settings_obj) -> bytes:
    """Generates a rental agreement PDF capturing terms, customer & vehicle details."""
    styles = _styles()
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=18 * mm, bottomMargin=18 * mm, leftMargin=16 * mm, rightMargin=16 * mm,
    )
    elements = []

    elements.append(Paragraph(settings_obj.company_name, styles["CompanyName"]))
    elements.append(Paragraph("VEHICLE RENTAL AGREEMENT", styles["DocTitle"]))
    elements.append(Spacer(1, 12))

    elements.append(Paragraph("Parties", styles["SectionHead"]))
    party_data = [
        ["Lessor (Company)", settings_obj.company_name],
        ["Lessee (Customer)", rental.customer.full_name],
        ["Customer Phone", rental.customer.phone],
        ["ID Proof", f"{rental.customer.get_id_proof_type_display()} - {rental.customer.id_proof_number or 'N/A'}"],
        ["Driving License No.", rental.customer.driving_license_number or "N/A"],
        ["Customer Address", rental.customer.address or "N/A"],
    ]
    t1 = Table(party_data, colWidths=[50 * mm, 128 * mm])
    t1.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("FONTNAME", (0, 0), (-1, -1), _FONT_REGULAR),
        ("FONTNAME", (0, 0), (0, -1), _FONT_BOLD),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD8E8")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
    ]))
    elements.append(t1)
    elements.append(Spacer(1, 12))

    elements.append(Paragraph("Vehicle & Trip", styles["SectionHead"]))
    veh_data = [
        ["Vehicle", f"{rental.vehicle.make} {rental.vehicle.model} ({rental.vehicle.year or '-'})"],
        ["Registration No.", rental.vehicle.registration_number],
        ["Scheduled Start", rental.scheduled_start.strftime("%d %b %Y, %I:%M %p")],
        ["Scheduled End", rental.scheduled_end.strftime("%d %b %Y, %I:%M %p")],
        ["Booked Days", str(rental.booked_days)],
        ["Destination / Purpose", f"{rental.destination or '-'} / {rental.purpose or '-'}"],
        ["Odometer at Pickup", str(rental.odometer_start) if rental.odometer_start is not None else "N/A"],
        ["Daily Rate", f"{settings_obj.currency_symbol}{rental.daily_rate_snapshot}"],
        ["Security Deposit", f"{settings_obj.currency_symbol}{rental.security_deposit_amount}" if rental.security_deposit_collected else "Not Collected"],
    ]
    t2 = Table(veh_data, colWidths=[50 * mm, 128 * mm])
    t2.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("FONTNAME", (0, 0), (-1, -1), _FONT_REGULAR),
        ("FONTNAME", (0, 0), (0, -1), _FONT_BOLD),
        ("BACKGROUND", (0, 0), (0, -1), LIGHT_BLUE),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD8E8")),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
    ]))
    elements.append(t2)
    elements.append(Spacer(1, 14))

    elements.append(Paragraph("Terms & Conditions", styles["SectionHead"]))
    terms = settings_obj.invoice_terms or ""
    for line in terms.split("\n"):
        if line.strip():
            elements.append(Paragraph(line.strip(), styles["Body"]))
    elements.append(Spacer(1, 6))
    elements.append(Paragraph(
        f"Late return policy: a grace period of {rental.grace_period_minutes_snapshot} minutes applies after scheduled return. "
        f"Returns up to 6 hours late are charged a half-day fee; beyond 6 hours, a full-day fee applies. "
        f"Extra KM beyond the included {rental.free_km_total_snapshot} km is charged at "
        f"{settings_obj.currency_symbol}{rental.extra_km_charge_snapshot} per km.",
        styles["Body"],
    ))
    elements.append(Spacer(1, 30))

    sign_data = [["Customer Signature", "Authorized Signatory"]]
    sign_table = Table(sign_data, colWidths=[89 * mm, 89 * mm])
    sign_table.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("FONTNAME", (0, 0), (-1, -1), _FONT_REGULAR),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("LINEABOVE", (0, 0), (-1, 0), 0.6, colors.black),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(sign_table)

    doc.build(elements)
    return buffer.getvalue()
