from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/game/(?P<challenger>\w+)/$', consumers.PongGameConsumer.as_asgi()),
]
