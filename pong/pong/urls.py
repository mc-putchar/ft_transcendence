from django.contrib import admin
from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('redirect', views.redirect_view, name='redirect_view'),
    path('users/', views.users, name='users'),
    path('users/profile/<int:id>', views.profile, name='profile'),
    path('admin/', admin.site.urls),
    path('login', views.login, name='login'),
    path('enter', views.enter, name='enter'),
    path('game', views.game, name='game'),
    # path("<str:room_name>/", views.room, name="room"),
]
