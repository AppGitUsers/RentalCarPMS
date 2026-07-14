from django.db.models.signals import post_delete, pre_save
from django.dispatch import receiver

from core.utils.media_cleanup import delete_changed_files, delete_instance_files

from .models import StaffMember


@receiver(post_delete, sender=StaffMember)
def _staff_delete_files(sender, instance, **kwargs):
    delete_instance_files(instance, ['photo'])


@receiver(pre_save, sender=StaffMember)
def _staff_replace_files(sender, instance, **kwargs):
    delete_changed_files(sender, instance, ['photo'])
