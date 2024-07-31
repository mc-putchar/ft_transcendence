from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import TemplateView
from django.shortcuts import redirect
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path("chat/", include("chat.urls")),
    path("web3/", include("blockchain.urls")),
    path('', include('pong.urls')),
    # re_path(r'^(?!admin/).*$', lambda request: redirect("/")) # Catch all other URLs
    path('chat/', include('chat.urls')),
    path('game/', include('game.urls')),
    path('', include('pong.urls')),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    # Optional UI:
    path('api/schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL,
                          document_root=settings.MEDIA_ROOT)

# urlpatterns += [re_path(r'^.*', include('pong.urls'))]
