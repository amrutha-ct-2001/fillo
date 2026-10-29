from django.urls import path

from . import views

urlpatterns = [
    path('', views.StationListCreateView.as_view()),
    path('<int:pk>/', views.StationUpdateView.as_view()),
]
