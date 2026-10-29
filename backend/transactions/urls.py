from django.urls import path

from . import views

urlpatterns = [
    path('', views.TransactionCreateView.as_view()),
    path('mine/', views.MyTransactionsView.as_view()),
    path('recent/', views.StaffRecentTransactionsView.as_view()),
    path('admin/dashboard/', views.AdminDashboardView.as_view()),
    path('admin/customers/<int:pk>/', views.AdminCustomerDetailView.as_view()),
]
