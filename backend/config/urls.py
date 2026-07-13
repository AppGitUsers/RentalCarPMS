from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from rentals.views import PublicInvoiceView

urlpatterns = [
    path('admin/', admin.site.urls),

    path('api/auth/', include('accounts.urls')),
    path('api/settings/', include('settings_app.urls')),
    path('api/owners/', include('owners.urls')),
    path('api/vehicles/', include('vehicles.urls')),
    path('api/customers/', include('customers.urls')),
    path('api/rentals/', include('rentals.urls')),
    path('api/staff/', include('staff.urls')),
    path('api/finance/', include('finance.urls')),
    path('api/', include('core.urls')),

    # Public (no auth) — customer-facing invoice share link
    path('api/public/invoice/<int:pk>/', PublicInvoiceView.as_view(), name='public-invoice'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
