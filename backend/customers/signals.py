from django.db.models.signals import post_delete, pre_save
from django.dispatch import receiver

from core.utils.media_cleanup import delete_changed_files, delete_instance_files

from .models import Customer

_FIELDS = ['customer_photo', 'id_proof_photo_front', 'id_proof_photo_back', 'driving_license_photo']


@receiver(post_delete, sender=Customer)
def _customer_delete_files(sender, instance, **kwargs):
    delete_instance_files(instance, _FIELDS)


@receiver(pre_save, sender=Customer)
def _customer_replace_files(sender, instance, **kwargs):
    delete_changed_files(sender, instance, _FIELDS)
