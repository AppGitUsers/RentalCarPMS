import io

from PIL import Image as PILImage
from rest_framework import serializers


class LenientImageField(serializers.ImageField):
    """
    DRF's ImageField delegates to Django's forms.ImageField which calls
    PIL's image.verify() — a strict structural check that rejects many
    camera-produced JPEGs (large EXIF blocks, HDR metadata, depth maps).
    Django 6 also added validate_image_file_extension which rejects files
    with no extension (common from Android camera capture inputs).

    This field skips both: it uses FileField's basic validation, then only
    calls PIL.Image.open() to confirm the bytes look like a known image
    format. No verify(), no extension check.
    """

    def to_internal_value(self, data):
        file_object = serializers.FileField.to_internal_value(self, data)
        try:
            raw = file_object.read()
            PILImage.open(io.BytesIO(raw))
        except Exception:
            self.fail('invalid_image')
        file_object.seek(0)
        return file_object
