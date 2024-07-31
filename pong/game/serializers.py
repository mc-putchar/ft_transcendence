from rest_framework import serializers
from api.models import Match, Profile, PlayerMatch, Tournament, TournamentPlayer

class MatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Match
        fields = '__all__'

class PlayerMatchSerializer(serializers.ModelSerializer):
    match = MatchSerializer()
    class Meta:
        model = PlayerMatch
        fields = ['match', 'score', 'winner']

class TournamentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tournament
        fields = '__all__'

class TournamentPlayerSerializer(serializers.ModelSerializer):
    tournament = TournamentSerializer()
    class Meta:
        model = TournamentPlayer
        fields = ['tournament']

class PlayerSerializer(serializers.ModelSerializer):
    matches_played = PlayerMatchSerializer(source='playermatch_set', many=True, read_only=True)
    tournaments_played = TournamentPlayerSerializer(source='tournamentplayer_set', many=True, read_only=True)
    class Meta:
        model = Profile
        fields = ['user', 'alias', 'friendList', 'isOnline', 'image', 'matches_played', 'tournaments_played']

