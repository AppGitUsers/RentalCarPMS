from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ApplicationSettings
from .serializers import ApplicationSettingsSerializer


class ApplicationSettingsView(APIView):
    """
    GET returns the single settings row (auto-created if missing).
    PATCH/PUT updates it. There is no list/create - this is always one row.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        obj = ApplicationSettings.load()
        return Response(ApplicationSettingsSerializer(obj).data)

    def patch(self, request):
        obj = ApplicationSettings.load()
        serializer = ApplicationSettingsSerializer(obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def put(self, request):
        return self.patch(request)
