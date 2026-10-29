from django.urls import path

from . import views

urlpatterns = [
    path('', views.RewardListCreateView.as_view()),
    path('<int:pk>/', views.RewardUpdateView.as_view()),
    path('<int:pk>/redeem/', views.RedeemView.as_view()),
    path('redemptions/', views.AdminRedemptionsView.as_view()),
    path('redemptions/mine/', views.MyRedemptionsView.as_view()),
    path('redemptions/<int:pk>/cancel/', views.CancelRedemptionView.as_view()),
    path('vouchers/<str:code>/', views.VoucherView.as_view()),
    path('vouchers/<str:code>/use/', views.UseVoucherView.as_view()),
]
