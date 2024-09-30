from django.urls import path
from .views import index, optin, commit

urlpatterns = [
	path('', index, name='index'),
	path('optin/', optin, name='optin'),
	path('commit/', commit, name='commit'),
]