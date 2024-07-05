from django.db import models
from django.contrib.auth.models import User

class User(models.Model):
    username = models.CharField(max_length=255)
    fullname = models.CharField(max_length=255)
    score = models.IntegerField(null=True)


class Game(models.Model):
    player1 = models.ForeignKey(User, related_name='player1', on_delete=models.CASCADE)
    player2 = models.ForeignKey(User, related_name='player2', on_delete=models.CASCADE, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    ball_position_x = models.FloatField(default=0.5)
    ball_position_y = models.FloatField(default=0.5)
    ball_velocity_x = models.FloatField(default=0.01)
    ball_velocity_y = models.FloatField(default=0.01)
    paddle1_y = models.FloatField(default=0.5)
    paddle2_y = models.FloatField(default=0.5)
