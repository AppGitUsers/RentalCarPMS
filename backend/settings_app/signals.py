from django.db.models.signals import pre_save
from django.dispatch import receiver

from core.utils.media_cleanup import delete_changed_files

from .models import ApplicationSettings


@receiver(pre_save, sender=ApplicationSettings)
def _settings_replace_logo(sender, instance, **kwargs):
    delete_changed_files(sender, instance, ['company_logo'])
