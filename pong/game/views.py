from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from api.models import Match, Profile, PlayerMatch, TournamentPlayer
from .serializers import MatchSerializer, PlayerSerializer, PlayerMatchSerializer, TournamentPlayerSerializer
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
        user = request.user
        player_count = PlayerMatch.objects.filter(match=match).count()
        if player_count >= 2:
            return Response({'status': 'match is full'}, status=status.HTTP_400_BAD_REQUEST)
        player, created = Profile.objects.get_or_create(user=user)
        if not PlayerMatch.objects.filter(match=match, player=player).exists():
            PlayerMatch.objects.create(match=match, player=player, score=0)
            return Response({'status': 'joined match'}, status=status.HTTP_200_OK)
        else:
            return Response({'status': 'already joined'}, status=status.HTTP_400_BAD_REQUEST)

class PlayerViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = PlayerSerializer

    @action(detail=True, methods=['get'])
    def match_history(self, request, pk=None):
        player = self.get_object()
        player_matches = PlayerMatch.objects.filter(player=player)
        serializer = PlayerMatchSerializer(player_matches, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def tournament_history(self, request, pk=None):
        player = self.get_object()
        tournament_players = TournamentPlayer.objects.filter(player=player)
        serializer = TournamentPlayerSerializer(tournament_players, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PlayerMatchViewSet(viewsets.ModelViewSet):
    queryset = PlayerMatch.objects.all()
    serializer_class = PlayerMatchSerializer

