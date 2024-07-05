from rest_framework import serializers
from .models import User, Game


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'fullname', 'score']


class GameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Game
        fields = [
            'id', 'player1', 'player2', 'is_active', 'ball_position_x',
            'ball_position_y', 'ball_velocity_x', 'ball_velocity_y',
            'paddle1_y', 'paddle2_y'
        ]
