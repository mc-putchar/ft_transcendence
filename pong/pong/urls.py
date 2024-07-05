from django.contrib import admin
from . import views
from django.urls import path, include
from django.views.generic.base import TemplateView

urlpatterns = [
    path('get-template/', views.get_template_content, name='get_template'),
    path("", TemplateView.as_view(template_name="index.html"), name="index"),
    path('loginExternal', views.loginExternal, name='loginExternal'),
    path('main', views.main),
    path('redirect', views.redirect_view, name='redirect_view'),
    path('admin/', admin.site.urls),
    path("accounts/", include("django.contrib.auth.urls")),
    path('login', views.login, name='login'),
    path('enter', views.enter, name='enter'),
    path('game', views.game, name='game'),
    # path("<str:room_name>/", views.room, name="room"),
]
