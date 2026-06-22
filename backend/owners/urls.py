from rest_framework.routers import DefaultRouter

from .views import CarOwnerViewSet

router = DefaultRouter()
router.register('', CarOwnerViewSet, basename='owner')

urlpatterns = router.urls
