from django.db.models.signals import post_delete, pre_save
from django.dispatch import receiver

from core.utils.media_cleanup import delete_changed_files, delete_instance_files

from .models import CarOwner


@receiver(post_delete, sender=CarOwner)
def _owner_delete_files(sender, instance, **kwargs):
    delete_instance_files(instance, ['id_proof_photo'])


@receiver(pre_save, sender=CarOwner)
def _owner_replace_files(sender, instance, **kwargs):
    delete_changed_files(sender, instance, ['id_proof_photo'])
