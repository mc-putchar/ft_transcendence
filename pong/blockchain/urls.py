from django.urls import path
from .views import index, optin, commit, addMatch, connect_wallet

urlpatterns = [
	path('', index, name='index'),
	path('optin/', optin, name='optin'),
	path('connect_wallet/', connect_wallet, name='connect_wallet'),
	path('commit/', commit, name='commit'),
    path('addMatch/', addMatch, name='addMatch'),
]