from django.urls import path

from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('templates/<str:template_name>', views.templates, name='templates'),
    path('profiles/<str:username>', views.profiles, name='profiles'),
]
