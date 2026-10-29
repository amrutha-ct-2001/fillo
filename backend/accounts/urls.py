from django.urls import path

from . import views

urlpatterns = [
    path('otp/request/', views.OTPRequestView.as_view()),
    path('otp/verify/', views.OTPVerifyView.as_view()),
    path('pin/login/', views.PinLoginView.as_view()),
    path('me/', views.MeView.as_view()),
    path('customers/lookup/', views.CustomerLookupView.as_view()),
    path('customers/', views.CustomerListView.as_view()),
    path('staff/', views.StaffListCreateView.as_view()),
    path('staff/<int:pk>/', views.StaffUpdateView.as_view()),
    path('staff/<int:pk>/deactivate/', views.StaffDeactivateView.as_view()),
    path('staff/<int:pk>/activate/', views.StaffActivateView.as_view()),
]
