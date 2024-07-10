from django.urls import path, re_path
from . import views
from django.contrib.auth import views as auth_views

urlpatterns = [
    path('', views.index, name='index'),
    path('home_data', views.home_data, name='home_data'),
    path('local_game', views.local_game, name='local_game'),
    path('contact_data', views.contact_data, name='contact_data'),

    path('logout', views.logout, name='logout'),  # Add this line
    path('login', views.login, name='login'),
    path('register', views.register, name='register'),

    path('online', views.online, name='online'),
    path('accounts/login/', auth_views.LoginView.as_view(), name='login'),
    path('accounts/logout/', auth_views.LogoutView.as_view(), name='logout'),
    path('auth42', views.auth42, name='auth42'),
    path('redirect', views.redirect_view, name='redirect_view'),

    # re path to catch all other urls
    # re_path(r'^.*$', views.index, name='index'),
]
