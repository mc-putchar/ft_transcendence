from django.urls import path
from .views import index, optin

urlpatterns = [
	path('', index, name='index'),
	path('optin/', optin, name='optin'),
]