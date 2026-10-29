from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Role, UserManager
from accounts.permissions import IsStaffUser

from .models import Vehicle, normalize_plate
from .serializers import VehicleCreateSerializer, VehicleSerializer

User = get_user_model()


class VehicleLookupView(APIView):
    permission_classes = [IsStaffUser]

    def get(self, request):
        plate = normalize_plate(request.query_params.get('plate', ''))
        if not plate:
            return Response({'detail': 'plate required'}, status=400)
        try:
            vehicle = Vehicle.objects.select_related('customer').get(plate_number=plate)
        except Vehicle.DoesNotExist:
            return Response({'detail': 'Not found'}, status=404)
        return Response(VehicleSerializer(vehicle, context={'request': request}).data)


class VehicleCreateView(APIView):
    permission_classes = [IsStaffUser]

    def post(self, request):
        serializer = VehicleCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        phone = UserManager.normalize_phone(data['phone'])
        customer, _ = User.objects.get_or_create(
            phone=phone,
            defaults={
                'name': data.get('name', ''),
                'role': Role.CUSTOMER,
            },
        )
        if data.get('name') and not customer.name:
            customer.name = data['name']
            customer.save(update_fields=['name'])

        plate = data['plate_number']
        vehicle, created = Vehicle.objects.get_or_create(
            plate_number=plate,
            defaults={
                'customer': customer,
                'vehicle_type': data.get('vehicle_type', 'BIKE'),
                'model_name': data.get('model_name', ''),
                'colour': data.get('colour', ''),
                'notes': data.get('notes', ''),
            },
        )
        if not created and vehicle.customer_id != customer.id:
            return Response(
                {'detail': 'Plate already registered to another customer'},
                status=status.HTTP_409_CONFLICT,
            )
        if data.get('photo'):
            vehicle.photo = data['photo']
            vehicle.save()

        return Response(
            VehicleSerializer(vehicle, context={'request': request}).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class MyVehiclesView(APIView):
    def get(self, request):
        qs = Vehicle.objects.filter(customer=request.user)
        return Response(
            VehicleSerializer(qs, many=True, context={'request': request}).data
        )
