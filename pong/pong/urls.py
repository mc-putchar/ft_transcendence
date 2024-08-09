from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('templates/in-tournament/<int:t_id>', views.in_tournament, name='in-tournament'),
    path('templates/<str:template_name>', views.templates, name='templates'),
    path('profiles/<str:username>', views.profiles, name='profiles'),
    path('auth42/', views.auth42, name='auth42'),
    path('redirect', views.redirect_view, name='redirect42'),
]
