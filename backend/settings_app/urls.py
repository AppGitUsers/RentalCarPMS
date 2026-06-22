from django.urls import path

from .views import ApplicationSettingsView

urlpatterns = [
    path('', ApplicationSettingsView.as_view(), name='app-settings'),
]
