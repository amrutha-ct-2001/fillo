from django.urls import path

from . import views

urlpatterns = [
    path('me/', views.MePointsView.as_view()),
    path('settings/', views.SettingsView.as_view()),
    path('adjust/', views.AdjustPointsView.as_view()),
]
