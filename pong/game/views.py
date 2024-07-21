from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from api.models import Match, Profile, PlayerMatch
from .serializers import MatchSerializer, PlayerSerializer, PlayerMatchSerializer
from django.contrib.auth.models import User

class MatchViewSet(viewsets.ModelViewSet):
    queryset = Match.objects.all()
    serializer_class = MatchSerializer

    @action(detail=False, methods=['post'])
    def create_match(self, request):
        match = Match.objects.create()
        return Response({'status': 'match created', 'match_id': match.id}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        match = self.get_object()
        if match.players > 1:
            return Response({'status': 'match full'}, status=status.HTTP_400_BAD_REQUEST)
        user = request.user
        player, created = Profile.objects.get_or_create(user=user)
        if not PlayerMatch.objects.filter(match=match, player=player).exists():
            PlayerMatch.objects.create(match=match, player=player, score=0)
            match.players += 1
            match.save()
            return Response({'status': 'joined match'}, status=status.HTTP_200_OK)
        else:
            return Response({'status': 'already joined'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def play(self, request, pk=None):
        match = self.get_object()
        player = Profile.objects.get(user=request.user)
        player_match = PlayerMatch.objects.get(match=match, player=player)
        player_match.score += 1  # Simplified game logic
        player_match.save()
        return Response({'status': 'score updated', 'score': player_match.score})

class PlayerViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = PlayerSerializer

class PlayerMatchViewSet(viewsets.ModelViewSet):
    queryset = PlayerMatch.objects.all()
    serializer_class = PlayerMatchSerializer
