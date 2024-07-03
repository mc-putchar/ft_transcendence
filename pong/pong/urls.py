"""
URL configuration for pong project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
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
    path('chat', views.chat, name='chat'),
    path("<str:room_name>/", views.room, name="room"),
    path('pong', views.pong, name='pong'),
]
