from django.contrib.auth import views as auth_views
from django.urls import include, path, re_path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('home_data', views.home_data, name='home_data'),
    path('local_game', views.local_game, name='local_game'),
    path('contact_data', views.contact_data, name='contact_data'),

    path('logout', views.logout, name='logout'),
    path('login', views.login, name='login'),
    path('register', views.register, name='register'),

    path('accounts/login/', auth_views.LoginView.as_view(), name='login'),
    path('accounts/logout/', auth_views.LogoutView.as_view(), name='logout'),
    path('auth42', views.auth42, name='auth42'),
    path('redirect', views.redirect_view, name='redirect_view'),
    path('online', views.online, name='online'),

    path('profile', views.update_profile, name='profile-update'),
    path('users', views.users, name='user-list'),
    path('users/<str:username>/', views.show_profile, name='profile-detail'),

    # re_path(r'^.*$', views.index, name='index'),
]
