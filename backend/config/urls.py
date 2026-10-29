from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/vehicles/', include('vehicles.urls')),
    path('api/transactions/', include('transactions.urls')),
    path('api/points/', include('points.urls')),
    path('api/stations/', include('stations.urls')),
    path('api/rewards/', include('rewards.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

admin.site.site_header = 'Fillo Admin'
admin.site.site_title = 'Fillo'
admin.site.index_title = 'Fuel Station Loyalty'
