from django.urls import path
from .views import index, optin, connect_wallet

urlpatterns = [
	path('', index, name='index'),
	path('optin/', optin, name='optin'),
	path('connect_wallet/', connect_wallet, name='connect_wallet')
]