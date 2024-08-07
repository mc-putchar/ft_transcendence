from django.db import models, transaction
from django.contrib.auth.models import User
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

import logging
import random

logger = logging.getLogger(__name__)

class Profile(models.Model):
    user = models.OneToOneField(User, related_name='profile', on_delete=models.CASCADE)
    alias = models.CharField(max_length=150, blank=True)
    isOnline = models.BooleanField(default=False)
    image = models.ImageField(upload_to='profile_images', default='profile_images/default.png')
    friends = models.ManyToManyField('self', through='Friend', symmetrical=False, related_name='friend_profiles', default=None, blank=True)
    blocked_users = models.ManyToManyField('self', through='Blocked', symmetrical=False, related_name='blocked_profiles', default=None, blank=True)

    def save(self, *args, **kwargs):
        if not self.alias:
            self.alias = f'marvin#{self.user.id}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.user.username} Profile'

    def set_online_status(self, status):
        """Set the online status of the user"""
        self.isOnline = status
        self.save()

    def matches_won(self):
        """Returns the number of matches won by the user."""
        return self.matches.filter(winner=True).count()

    def add_friend(self, friend_user):
        """Adds a friend to the current user's profile."""
        if not Friend.objects.filter(from_user=self.user, to_user=friend_user).exists():
            Friend.objects.create(from_user=self.user, to_user=friend_user)

    def remove_friend(self, friend_user):
        """Removes a friend from the current user's profile."""
        try:
            Friend.objects.get(from_user=self.user, to_user=friend_user).delete()
        except Friend.DoesNotExist:
            logger.error(f"Friend does not exist: {self.user.username} -> {friend_user.username}")

    def block_user(self, blocked_user):
        """Blocks a user from the current user's profile."""
        if not Blocked.objects.filter(blocker=self.user, blocked=blocked_user).exists():
            Blocked.objects.create(blocker=self.user, blocked=blocked_user)

    def unblock_user(self, blocked_user):
        """Unblocks a user from the current user's profile."""
        try:
            Blocked.objects.filter(blocker=self.user, blocked=blocked_user).delete()
        except Blocked.DoesNotExist:
            logger.error(f"Blocked user does not exist: {self.user.username} -> {blocked_user.username}")

    def get_friends(self):
        """Returns a QuerySet of users who are friends with the current user."""
        friend_ids = Friend.objects.filter(from_user=self.user).values_list('to_user', flat=True)
        return User.objects.filter(id__in=friend_ids)

    def is_friend(self, user):
        """Returns True if the user is a friend of the current user, False otherwise."""
        return Friend.objects.filter(from_user=self.user, to_user=user).exists()

    def get_blocked_users(self):
        """Returns a QuerySet of users who are blocked by the current user."""
        blocked_ids = Blocked.objects.filter(blocker=self.user).values_list('blocked', flat=True)
        return User.objects.filter(id__in=blocked_ids)

    def is_blocked(self, user):
        """Returns True if the user is blocked by the current user, False otherwise."""
        return Blocked.objects.filter(blocker=self.user, blocked=user).exists()


class Friend(models.Model):
    from_user = models.ForeignKey(User, related_name='friend_from', on_delete=models.CASCADE)
    to_user = models.ForeignKey(User, related_name='friend_to', on_delete=models.CASCADE)

    class Meta:
        unique_together = ('from_user', 'to_user')

    def __str__(self):
        return f'{self.from_user.username} -> {self.to_user.username}'

class Blocked(models.Model):
    blocker = models.ForeignKey(User, related_name='block_from', on_delete=models.CASCADE)
    blocked = models.ForeignKey(User, related_name='block_to', on_delete=models.CASCADE)

    class Meta:
        unique_together = ('blocker', 'blocked')

    def __str__(self):
        return f'{self.blocker.username} blocked {self.blocked.username}'   


class Tournament(models.Model):
    name = models.CharField(max_length=255, default="super-pong-tournament")
    creator = models.ForeignKey(Profile, on_delete=models.SET_NULL, related_name='tournaments_created', null=True)
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=50, default='open')
    on_blockchain = models.BooleanField(default=False)
    player_limit = models.IntegerField(default=16)
    prize = models.IntegerField(default=0)
    entry_fee = models.IntegerField(default=0)
    winner = models.ForeignKey(Profile, null=True, blank=True, on_delete=models.SET_NULL, related_name='tournaments_won')
    final_result = models.TextField(blank=True)

    def __str__(self):
        return self.name

    def is_full(self):
        """Returns True if the tournament is full, False otherwise."""
        return self.participants.count() >= self.player_limit

    def is_open(self):
        """Returns True if the tournament is open, False otherwise."""
        return self.status == 'open'

    def is_started(self):
        """Returns True if the tournament is started, False otherwise."""
        return self.status == 'started'

    def is_over(self):
        """Returns True if the tournament is closed, False otherwise."""
        return self.status == 'closed'

    def get_players(self):
        """Returns a QuerySet of players who are participating in the tournament."""
        return self.participants.all()

    def player_count(self):
        """Returns the number of players participating in the tournament."""
        return self.participants.count()

    def add_player(self, player):
        """Adds a player to the tournament."""
        TournamentPlayer.objects.create(tournament=self, player=player)

    def remove_player(self, player):
        """Removes a player from the tournament."""
        TournamentPlayer.objects.get(tournament=self, player=player).delete()

    def is_player(self, user):
        """Returns True if the user is participating in the tournament, False otherwise."""
        return self.participants.filter(player__user=user).exists()

    def get_matches(self):
        """Returns a QuerySet of matches in the tournament."""
        return self.matches.all()

    def add_match(self, match):
        """Adds a match to the tournament."""
        match.tournament = self
        match.save()

    def start(self):
        """Starts the tournament and does the initial matchmaking."""
        try:
            if not self.is_open():
                raise ValueError("Tournament is not open")
            with transaction.atomic():
                self.status = 'started'
                self.save()
                players = list(self.get_players())
                random.shuffle(players)
                if len(players) < 2:
                    raise ValueError("Not enough players to start the tournament")
                for i in range(0, len(players), 2):
                    if i + 1 < len(players):
                        match = Match.objects.create(tournament=self)
                        PlayerMatch.objects.create(match=match, player=players[i])
                        PlayerMatch.objects.create(match=match, player=players[i + 1])
                self.notify_players()
        except ValueError as e:
            logger.error(f"Failed to start tournament: {e}")

    def notify_players(self):
        """Notifies players in the tournament that the tournament has started."""
        channel_layer = get_channel_layer()
        matches = self.get_matches()
        for match in matches:
            logger.info(f"Tournament match {match} scheduled: {match.players.all()}")
            async_to_sync(channel_layer.group_send)(
                f'tournament_{self.id}',
                {
                    'type': 'tournament_message',
                    'message': f'match {match.id} {match.players[0].player.user} vs {match.players[1].player.user}'
                }
            )

class Match(models.Model):
    tournament = models.ForeignKey(Tournament, null=True, blank=True, on_delete=models.CASCADE, related_name='matches')
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Match on {self.date}"


class PlayerMatch(models.Model):
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name='players')
    player = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='matches')
    score = models.IntegerField(default=0)
    winner = models.BooleanField(default=False)

    class Meta:
        unique_together = ('match', 'player')

    def __str__(self):
        return f"{self.player} in {self.match} scored {self.score} and {'won' if self.winner else 'lost'} "


class TournamentPlayer(models.Model):
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='participants')
    player = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='tournaments')
    place = models.IntegerField(null=True, blank=True, default=0)

    class Meta:
        unique_together = ('tournament', 'player')

    def __str__(self):
        return f"{self.player} in tournament: {self.tournament}"

