from rest_framework.routers import DefaultRouter

from .views import RentalViewSet

router = DefaultRouter()
router.register('', RentalViewSet, basename='rental')

urlpatterns = router.urls
