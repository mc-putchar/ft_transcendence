from rest_framework import serializers
from api.models import Match, Profile, PlayerMatch

class PlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ['id', 'user']

class MatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Match
        fields = ['id', 'tournament', 'date']

class PlayerMatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlayerMatch
        fields = ['id', 'match', 'player', 'score', 'winner']
