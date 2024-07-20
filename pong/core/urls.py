from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import TemplateView
from django.shortcuts import redirect

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path("chat/", include("chat.urls")),
    path("web3/", include("blockchain.urls")),
    path('', include('pong.urls')),
    # re_path(r'^(?!admin/).*$', lambda request: redirect("/")) # Catch all other URLs
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL,
                          document_root=settings.MEDIA_ROOT)

urlpatterns += [re_path(r'^.*', include('pong.urls'))]
