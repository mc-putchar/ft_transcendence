from django.contrib import admin
from . import views
from django.urls import path, include
from django.views.generic.base import TemplateView
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.staticfiles.views import serve
from django.views.decorators.cache import cache_control


urlpatterns = [
    path('get-template/', views.get_template_content, name='get_template'),
    path("", TemplateView.as_view(template_name="index.html"), name="index"),
    # path('loginExternal', views.loginExternal, name='loginExternal'),
    # path('main', views.main),
    path('redirect', views.redirect_view, name='redirect_view'),
    path('admin/', admin.site.urls),
    path("accounts/", include("django.contrib.auth.urls")),
    path('login', views.login42, name='login42'),
    path('enter', views.enter, name='enter'),
    # path('game', views.game, name='game'),
]


if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL,
                          view=cache_control(no_cache=True, must_revalidate=True)(serve))
