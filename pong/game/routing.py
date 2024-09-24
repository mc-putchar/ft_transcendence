from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path('ws/game/<str:challenger>/', consumers.PongGameConsumer.as_asgi()),
    path('ws/tournament/<int:tournament_id>/', consumers.PongTournamentConsumer.as_asgi()),
	path("ws/online4P/<str:challenger>", consumers.handle4PGame.as_asgi())
]
