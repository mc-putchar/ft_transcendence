from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MatchViewSet, PlayerViewSet, PlayerMatchViewSet, TournamentViewSet

router = DefaultRouter()
router.register(r'matches', MatchViewSet)
router.register(r'players', PlayerViewSet)
router.register(r'player_matches', PlayerMatchViewSet)
router.register(r'tournaments', TournamentViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
