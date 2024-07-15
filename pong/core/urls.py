from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.generic import TemplateView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path("chat/", include("chat.urls")),
    path('', include('pong.urls')),
]
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


# Catch-all rule for SPA
urlpatterns += [
    re_path(r'^.*$', TemplateView.as_view(template_name='index.html')),
]
