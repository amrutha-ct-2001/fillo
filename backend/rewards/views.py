from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin, IsCustomer, IsStaffUser
from points.services import get_balance

from .models import Redemption, RedemptionStatus, Reward
from .serializers import RedemptionSerializer, RewardSerializer
from .services import RewardError, cancel_redemption, redeem_reward, use_voucher


class RewardListCreateView(APIView):
    """Customers and staff see active rewards; admin sees all and can add one."""

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsAuthenticated()]
        return [IsAdmin()]

    def get(self, request):
        qs = Reward.objects.all()
        if not IsAdmin().has_permission(request, self):
            qs = qs.filter(is_active=True)
        return Response(RewardSerializer(qs, many=True).data)

    def post(self, request):
        serializer = RewardSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class RewardUpdateView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            reward = Reward.objects.get(pk=pk)
        except Reward.DoesNotExist:
            return Response({'detail': 'Not found'}, status=404)
        serializer = RewardSerializer(reward, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class RedeemView(APIView):
    permission_classes = [IsCustomer]

    def post(self, request, pk):
        try:
            redemption = redeem_reward(request.user, pk)
        except RewardError as e:
            return Response({'detail': str(e)}, status=400)
        data = RedemptionSerializer(redemption).data
        data['balance'] = get_balance(request.user)
        return Response(data, status=status.HTTP_201_CREATED)


class MyRedemptionsView(APIView):
    permission_classes = [IsCustomer]

    def get(self, request):
        qs = Redemption.objects.filter(customer=request.user).select_related('reward')[:50]
        return Response(RedemptionSerializer(qs, many=True).data)


class AdminRedemptionsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        qs = Redemption.objects.select_related('reward', 'customer', 'verified_by')
        wanted = request.query_params.get('status', '').upper()
        if wanted in RedemptionStatus.values:
            qs = qs.filter(status=wanted)
        return Response(RedemptionSerializer(qs[:100], many=True).data)


class CancelRedemptionView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            redemption = cancel_redemption(pk, by=request.user)
        except RewardError as e:
            return Response({'detail': str(e)}, status=400)
        return Response(RedemptionSerializer(redemption).data)


class VoucherView(APIView):
    """Staff check a voucher code the customer shows at the counter."""

    permission_classes = [IsStaffUser]

    def get(self, request, code):
        try:
            redemption = Redemption.objects.select_related('reward', 'customer').get(
                code=code.strip().upper()
            )
        except Redemption.DoesNotExist:
            return Response({'detail': 'Voucher not found'}, status=404)
        return Response(RedemptionSerializer(redemption).data)


class UseVoucherView(APIView):
    permission_classes = [IsStaffUser]

    def post(self, request, code):
        try:
            redemption = use_voucher(request.user, code)
        except RewardError as e:
            return Response({'detail': str(e)}, status=400)
        return Response(RedemptionSerializer(redemption).data)
