from django.apps import AppConfig


class SettingsAppConfig(AppConfig):
    name = 'settings_app'

    def ready(self):
        import settings_app.signals  # noqa: F401
