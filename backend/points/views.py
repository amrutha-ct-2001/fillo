from django.contrib.auth import get_user_model
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import Role
from accounts.permissions import IsAdmin, IsStaffUser

from .models import LedgerType
from .serializers import AdjustPointsSerializer, PointsLedgerSerializer, SettingsSerializer
from .services import add_ledger_entry, get_balance, get_settings

User = get_user_model()


class MePointsView(APIView):
    def get(self, request):
        settings = get_settings()
        ledger = request.user.points_ledger.all()[:50]
        return Response(
            {
                'balance': get_balance(request.user),
                'settings': SettingsSerializer(settings).data,
                'ledger': PointsLedgerSerializer(ledger, many=True).data,
            }
        )


class SettingsView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsStaffUser()]
        return [IsAdmin()]

    def get(self, request):
        return Response(SettingsSerializer(get_settings()).data)

    def patch(self, request):
        settings = get_settings()
        serializer = SettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class AdjustPointsView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request):
        serializer = AdjustPointsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            customer = User.objects.get(pk=data['customer_id'], role=Role.CUSTOMER)
        except User.DoesNotExist:
            return Response({'detail': 'Customer not found'}, status=404)
        entry = add_ledger_entry(
            customer=customer,
            delta=data['delta'],
            entry_type=LedgerType.ADJUST,
            note=data.get('note', 'Manual adjustment'),
            created_by=request.user,
        )
        return Response(
            {
                'entry': PointsLedgerSerializer(entry).data,
                'balance': get_balance(customer),
            },
            status=201,
        )
