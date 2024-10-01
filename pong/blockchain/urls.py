from django.urls import path
from .views import index, optin, commit, addMatch

urlpatterns = [
	path('', index, name='index'),
	path('optin/', optin, name='optin'),
	path('commit/', commit, name='commit'),
    path('addMatch/', addMatch, name='addMatch'),
]