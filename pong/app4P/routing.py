from django.contrib import admin
from django.urls import path, include
from . import consumers

ASGI_urlpatterns = [
	path("websocket/<str:username>", consumers.handle4PGame.as_asgi()),
]
