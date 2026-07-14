import logging
import os

logger = logging.getLogger(__name__)


def delete_file(field):
    """Delete the physical file for an ImageField/FileField value. Silent on errors."""
    if not field:
        return
    try:
        path = field.path
    except (ValueError, AttributeError):
        return
    if os.path.isfile(path):
        try:
            os.remove(path)
            logger.info("Deleted orphaned file: %s", path)
        except OSError as exc:
            logger.warning("Could not delete file %s: %s", path, exc)


def delete_instance_files(instance, field_names):
    """Delete all named ImageField files on a model instance."""
    for name in field_names:
        delete_file(getattr(instance, name, None))


def delete_changed_files(sender, instance, field_names):
    """
    Called in pre_save. Fetches the current DB row and deletes the old file
    for any field whose value has changed in the incoming save.
    """
    if not instance.pk:
        return
    try:
        old = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return
    for name in field_names:
        old_file = getattr(old, name, None)
        new_file = getattr(instance, name, None)
        old_name = old_file.name if old_file else None
        new_name = new_file.name if new_file else None
        if old_name and old_name != new_name:
            delete_file(old_file)
