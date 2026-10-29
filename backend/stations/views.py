from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin

from .models import Station
from .serializers import StationSerializer


class StationListCreateView(APIView):
    """Everyone sees active stations; admin sees all and can add one."""

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdmin()]

    def get(self, request):
        qs = Station.objects.all()
        if not IsAdmin().has_permission(request, self):
            qs = qs.filter(is_active=True)
        return Response(StationSerializer(qs, many=True).data)

    def post(self, request):
        serializer = StationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class StationUpdateView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            station = Station.objects.get(pk=pk)
        except Station.DoesNotExist:
            return Response({'detail': 'Not found'}, status=404)
        serializer = StationSerializer(station, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
