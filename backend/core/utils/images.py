import io
import os

from django.core.files.uploadedfile import InMemoryUploadedFile
from PIL import Image


def compress_image_field(field, max_px, quality=85):
    """
    Compress a pending ImageField upload in memory before it's written to storage.
    Only runs on new uploads (_committed=False). Skips unchanged / existing files.
    Converts to JPEG and resizes to max_px on the longest side.
    """
    if not field or getattr(field, '_committed', True):
        return
    try:
        raw = field.read()
        img = Image.open(io.BytesIO(raw))
        if img.mode != 'RGB':
            img = img.convert('RGB')
        if max(img.width, img.height) > max_px:
            img.thumbnail((max_px, max_px), Image.LANCZOS)

        buf = io.BytesIO()
        img.save(buf, format='JPEG', quality=quality, optimize=True)
        buf.seek(0)

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
    except Exception:
        pass  # never break a save due to compression failure
