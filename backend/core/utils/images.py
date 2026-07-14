import io
import logging
import os

from django.core.files.uploadedfile import InMemoryUploadedFile
from PIL import Image

logger = logging.getLogger(__name__)


def compress_image_field(field, max_px, quality=85):
    """
    Compress a pending ImageField upload in memory before it's written to storage.
    Only runs on new uploads (_committed=False). Skips unchanged / existing files.
    Converts to JPEG and resizes to max_px on the longest side.
    """
    if not field or getattr(field, '_committed', True):
        return
    original_name = getattr(field, 'name', '?')
    try:
        raw = field.read()
        original_kb = len(raw) / 1024
        img = Image.open(io.BytesIO(raw))
        original_dims = f"{img.width}x{img.height}"
        if img.mode != 'RGB':
            img = img.convert('RGB')
        if max(img.width, img.height) > max_px:
            img.thumbnail((max_px, max_px), Image.LANCZOS)

        buf = io.BytesIO()
        img.save(buf, format='JPEG', quality=quality, optimize=True)
        buf.seek(0)
        compressed_kb = buf.getbuffer().nbytes / 1024

        stem = os.path.splitext(os.path.basename(field.name))[0]
        new_name = f'{stem}.jpg'

        field.file = InMemoryUploadedFile(
            file=buf,
            field_name=None,
            name=new_name,
            content_type='image/jpeg',
            size=buf.getbuffer().nbytes,
            charset=None,
        )
        field.name = new_name
        logger.info(
            "Image compressed: %s %s → %s | %.0fKB → %.0fKB (quality=%s, max=%spx)",
            original_name, original_dims, f"{img.width}x{img.height}",
            original_kb, compressed_kb, quality, max_px,
        )
    except Exception as exc:
        logger.error(
            "Image compression failed for %s: %s — original will be saved uncompressed",
            original_name, exc, exc_info=True,
        )
        try:
            field.file.seek(0)
        except Exception:
            pass
