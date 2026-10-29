from django.urls import path

from . import views

urlpatterns = [
    path('lookup/', views.VehicleLookupView.as_view()),
    path('', views.VehicleCreateView.as_view()),
    path('mine/', views.MyVehiclesView.as_view()),
]
