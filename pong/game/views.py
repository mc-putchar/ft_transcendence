from django.contrib.auth.models import User
from django.shortcuts import render
from django.template import loader
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from api.models import Match, Profile, PlayerMatch, Tournament, TournamentPlayer
from .serializers import MatchSerializer, PlayerSerializer, PlayerMatchSerializer, TournamentPlayerSerializer, TournamentSerializer
from .forms import CreateTournamentForm

import logging

logger = logging.getLogger(__name__)

class MatchViewSet(viewsets.ModelViewSet):
    """API endpoint for matches."""
    permission_classes = [IsAuthenticated]
    queryset = Match.objects.all()
    serializer_class = MatchSerializer

    @action(detail=False, methods=['post'])
    def create_match(self, request):
        """Create a new match."""
        match = Match.objects.create()
        return Response({'message': 'match created', 'match_id': match.id}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        """Join a match."""
        match = self.get_object()
        user = request.user
        player_count = PlayerMatch.objects.filter(match=match).count()
        if match.is_player(user):
            return Response({'message': 'already joined'}, status=status.HTTP_200_OK)
        if player_count >= 2:
            return Response({'message': 'match is full'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            player = Profile.objects.get(user=user)
        except Profile.DoesNotExist:
            return Response({'message': 'player does not exist'}, status=status.HTTP_400_BAD_REQUEST)
        PlayerMatch.objects.create(match=match, player=player, score=0)
        return Response({'message': 'joined match'}, status=status.HTTP_200_OK)

class PlayerViewSet(viewsets.ModelViewSet):
    """API endpoint for players."""
    permission_classes = [IsAuthenticated]
    queryset = Profile.objects.all()
    serializer_class = PlayerSerializer

    @action(detail=True, methods=['get'])
    def match_history(self, request, pk=None):
        """Get the match history for a player."""
        player = self.get_object()
        player_matches = PlayerMatch.objects.filter(player=player)
        serializer = PlayerMatchSerializer(player_matches, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def tournament_history(self, request, pk=None):
        """Get the tournament history for a player."""
        player = self.get_object()
        tournament_players = TournamentPlayer.objects.filter(player=player)
        serializer = TournamentPlayerSerializer(tournament_players, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PlayerMatchViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = PlayerMatch.objects.all()
    serializer_class = PlayerMatchSerializer

class TournamentViewSet(viewsets.ModelViewSet):
    """API endpoint for tournaments."""
    permission_classes = [IsAuthenticated]
    queryset = Tournament.objects.all()
    serializer_class = TournamentSerializer

    @action(detail=False, methods=['get', 'post'])
    def create_tournament_form(self, request):
        """Create a new tournament through a form."""
        if request.method == 'POST':
            form = CreateTournamentForm(request.POST)
            if form.is_valid():
                try:
                    creator = Profile.objects.get(user=request.user)
                except Profile.DoesNotExist:
                    return Response({'message': 'player does not exist'}, status=status.HTTP_400_BAD_REQUEST)
                tournament = form.save(commit=False)
                tournament.creator = creator
                tournament.save()
                return Response({'message': 'tournament created', 'tournament_id': tournament.id}, status=status.HTTP_201_CREATED)
            else:
                return Response({'message': 'form invalid'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            form = CreateTournamentForm()
            tournaments = self.open_tournaments(request)
            context = {
                't_form': form,
                'tournaments': tournaments.data
            }
            template = loader.get_template('tournaments.html')
            return Response(template.render(context, request=request), status=status.HTTP_200_OK)

    @action(detail=True, methods=['delete'])
    def delete_tournament(self, request, pk=None):
        """Delete a tournament."""
        tournament = self.get_object()
        if tournament.creator != request.user.profile:
            return Response({'message': 'only the tournament creator can delete the tournament'}, status=status.HTTP_403_FORBIDDEN)
        tournament.delete()
        return Response({'message': 'tournament deleted'}, status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        """Join a tournament."""
        tournament = self.get_object()
        user = request.user
        player_count = TournamentPlayer.objects.filter(tournament=tournament).count()
        try:
            player = Profile.objects.get(user=user)
        except Profile.DoesNotExist:
            return Response({'message': 'player does not exist'}, status=status.HTTP_400_BAD_REQUEST)
        if not TournamentPlayer.objects.filter(tournament=tournament, player=player).exists():
            if player_count >= tournament.player_limit:
                return Response({'message': 'tournament is full'}, status=status.HTTP_400_BAD_REQUEST)
            tournament.add_player(player)
            return Response({'message': 'joined tournament'}, status=status.HTTP_200_OK)
        else:
            return Response({'message': 'already joined'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        """Leave a tournament."""
        tournament = self.get_object()
        user = request.user
        try:
            player = Profile.objects.get(user=user)
        except Profile.DoesNotExist:
            return Response({'message': 'player does not exist'}, status=status.HTTP_400_BAD_REQUEST)
        if TournamentPlayer.objects.filter(tournament=tournament, player=player).exists():
            tournament.remove_player(player)
            return Response({'message': 'left tournament'}, status=status.HTTP_200_OK)
        else:
            return Response({'message': 'not in tournament'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def open_tournaments(self, request):
        """Get a list of open tournaments."""
        tournaments = Tournament.objects.filter(status='open')
        serializer = TournamentSerializer(tournaments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def player_list(self, request, pk=None):
        """Get a list of players in a tournament."""
        tournament = self.get_object()
        tournament_players = tournament.get_players()
        serializer = TournamentPlayerSerializer(tournament_players, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def start_tournament(self, request, pk=None):
        """Start a tournament."""
        tournament = self.get_object()
        if tournament.creator != request.user.profile:
            return Response({'message': 'only the tournament creator can start the tournament'}, status=status.HTTP_403_FORBIDDEN)
        if tournament.status != 'open':
            logger.error("Tournament is not open")
            return Response({'message': 'tournament is not open'}, status=status.HTTP_400_BAD_REQUEST)
        if tournament.player_count() < 2:
            logger.error("Tournament needs at least 2 players")
            return Response({'message': 'tournament needs at least 2 players'}, status=status.HTTP_400_BAD_REQUEST)
        tournament.start()
        return Response({'message': 'tournament started'}, status=status.HTTP_200_OK)

