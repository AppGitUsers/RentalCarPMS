from django.apps import AppConfig


class OwnersConfig(AppConfig):
    name = 'owners'

    def ready(self):
        import owners.signals  # noqa: F401
