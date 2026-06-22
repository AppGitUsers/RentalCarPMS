from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    FinanceEntryViewSet, FinanceExcelExportView, FinanceSummaryView, FinanceTrendView,
)

router = DefaultRouter()
router.register('entries', FinanceEntryViewSet, basename='finance-entry')

urlpatterns = [
    path('summary/', FinanceSummaryView.as_view(), name='finance-summary'),
    path('trend/', FinanceTrendView.as_view(), name='finance-trend'),
    path('export/', FinanceExcelExportView.as_view(), name='finance-export'),
] + router.urls
