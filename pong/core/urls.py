from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path("chat/", include("chat.urls")),
    path("web3/", include("blockchain.urls")),
    path('chat/', include('chat.urls')),
    path('game/', include('game.urls')),
    path('', include('pong.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL,
                          document_root=settings.MEDIA_ROOT)

# urlpatterns += [re_path(r'^.*', include('pong.urls'))]
