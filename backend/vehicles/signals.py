from django.db.models.signals import post_delete, pre_save
from django.dispatch import receiver

from core.utils.media_cleanup import delete_changed_files, delete_instance_files

from .models import Vehicle, VehicleImage


@receiver(post_delete, sender=Vehicle)
def _vehicle_delete_files(sender, instance, **kwargs):
    delete_instance_files(instance, ['primary_photo'])


@receiver(pre_save, sender=Vehicle)
def _vehicle_replace_files(sender, instance, **kwargs):
    delete_changed_files(sender, instance, ['primary_photo'])


@receiver(post_delete, sender=VehicleImage)
def _gallery_image_delete(sender, instance, **kwargs):
    delete_instance_files(instance, ['image'])
