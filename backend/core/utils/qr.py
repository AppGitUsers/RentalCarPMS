import base64
import io

import qrcode


def generate_upi_qr_base64(upi_id: str, payee_name: str, amount, transaction_note: str = "") -> str:
    """
    Builds a standard UPI deep-link (upi://pay?...) and renders it as a QR
    code, returned as a base64 PNG data URI so the frontend can drop it
    straight into an <img src="..."> with no extra round trip.

    The amount is embedded in the QR itself, so the QR is genuinely dynamic:
    every time the displayed amount changes (e.g. balance due updates after
    a partial payment), the backend re-generates a fresh QR for the new
    amount - no static/stored QR images are used.
    """
    if not upi_id:
        return ""

    params = {
        "pa": upi_id,          # payee address (UPI ID)
        "pn": payee_name or "Payee",
        "am": f"{float(amount):.2f}",
        "cu": "INR",
    }
    if transaction_note:
        params["tn"] = transaction_note

    from urllib.parse import urlencode
    upi_url = "upi://pay?" + urlencode(params)

    img = qrcode.make(upi_url, box_size=8, border=2)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{encoded}"
