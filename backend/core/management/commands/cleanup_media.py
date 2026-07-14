"""
Management command: cleanup_media

Scans the media directory and deletes any image files that are not referenced
by any database record.

Usage:
    python manage.py cleanup_media           # dry run — shows what would be deleted
    python manage.py cleanup_media --delete  # actually deletes the orphaned files
"""

import os

from django.conf import settings
from django.core.management.base import BaseCommand

from customers.models import Customer
from owners.models import CarOwner
from settings_app.models import ApplicationSettings
from staff.models import StaffMember
from vehicles.models import Vehicle, VehicleImage


def _collect_db_paths():
    """Return a set of all media file paths currently referenced in the DB."""
    paths = set()

    def add(field):
        if field and field.name:
            paths.add(os.path.normpath(os.path.join(settings.MEDIA_ROOT, field.name)))

    for c in Customer.objects.all():
        add(c.customer_photo)
        add(c.id_proof_photo_front)
        add(c.id_proof_photo_back)
        add(c.driving_license_photo)

    for v in Vehicle.objects.all():
        add(v.primary_photo)

    for vi in VehicleImage.objects.all():
        add(vi.image)

    for s in StaffMember.objects.all():
        add(s.photo)

    for o in CarOwner.objects.all():
        add(o.id_proof_photo)

    try:
        s = ApplicationSettings.load()
        add(s.company_logo)
    except Exception:
        pass

    return paths


class Command(BaseCommand):
    help = 'Delete media files not referenced by any database record.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--delete',
            action='store_true',
            help='Actually delete orphaned files (default is dry run).',
        )

    def handle(self, *args, **options):
        do_delete = options['delete']
        media_root = settings.MEDIA_ROOT

        if not os.path.isdir(media_root):
            self.stderr.write(f'MEDIA_ROOT does not exist: {media_root}')
            return

        db_paths = _collect_db_paths()
        self.stdout.write(f'DB references: {len(db_paths)} files')

        orphans = []
        total_bytes = 0

        for dirpath, _dirs, filenames in os.walk(media_root):
            for fname in filenames:
                fpath = os.path.normpath(os.path.join(dirpath, fname))
                if fpath not in db_paths:
                    size = os.path.getsize(fpath)
                    orphans.append((fpath, size))
                    total_bytes += size

        if not orphans:
            self.stdout.write(self.style.SUCCESS('No orphaned files found.'))
            return

        mode = 'DELETE' if do_delete else 'DRY RUN'
        self.stdout.write(f'\n[{mode}] {len(orphans)} orphaned file(s) — '
                          f'{total_bytes / 1024:.1f} KB total\n')

        for fpath, size in orphans:
            rel = os.path.relpath(fpath, media_root)
            self.stdout.write(f'  {rel}  ({size / 1024:.1f} KB)')
            if do_delete:
                try:
                    os.remove(fpath)
                except OSError as exc:
                    self.stderr.write(f'    ERROR: {exc}')

        if do_delete:
            self.stdout.write(self.style.SUCCESS(
                f'\nDeleted {len(orphans)} file(s), freed {total_bytes / 1024:.1f} KB.'
            ))
        else:
            self.stdout.write(
                '\nRun with --delete to remove these files.'
            )
