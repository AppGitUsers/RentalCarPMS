from decouple import config as env
from django.core.management.base import BaseCommand

from accounts.models import AdminUser


class Command(BaseCommand):
    help = "Creates the initial admin (superuser) account if one does not already exist."

    def handle(self, *args, **options):
        username = env('INITIAL_ADMIN_USERNAME', default='admin')
        password = env('INITIAL_ADMIN_PASSWORD', default='')
        email = env('INITIAL_ADMIN_EMAIL', default='admin@example.com')

        if AdminUser.objects.filter(is_superuser=True).exists():
            self.stdout.write(self.style.WARNING('An admin user already exists - skipping.'))
            return

        if not password:
            self.stdout.write(self.style.ERROR(
                'Set INITIAL_ADMIN_PASSWORD in your .env before running this command.'
            ))
            return

        AdminUser.objects.create_superuser(username=username, email=email, password=password)
        self.stdout.write(self.style.SUCCESS(f'Admin user "{username}" created successfully.'))
