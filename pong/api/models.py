from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Profile(models.Model):
    user = models.OneToOneField(User, related_name='profile', on_delete=models.CASCADE)
    alias = models.CharField(max_length=150, blank=True)
    isOnline = models.BooleanField(default=False)
    image = models.ImageField(upload_to='profile_images', default='profile_images/default.png')

    def save(self, *args, **kwargs):
        if not self.alias:
            self.alias = f'marvin#{self.user.id}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.user.username} Profile'

    def set_online_status(self, status):
        self.isOnline = status
        self.save()


class Friend(models.Model):
    current_user = models.ForeignKey(User, related_name='friend', on_delete=models.CASCADE)
    friends = models.ManyToManyField(User, related_name='friends_with')

    @classmethod
    def make_friend(cls, current_user, new_friend):
        friend, _ = cls.objects.get_or_create(
            current_user=current_user
        )
        friend.friends.add(new_friend)

    # Forever alone
    @classmethod
    def lose_friend(cls, current_user, old_friend):
        friend, _ = cls.objects.get_or_create(
            current_user=current_user
        )
        friend.friends.remove(old_friend)

    @classmethod
    def is_friend(cls, current_user, other_user):
        friend, _ = cls.objects.get_or_create(
            current_user=current_user
        )
        return friend.friends.filter(id=other_user.id).exists()


class Blocked(models.Model):
    annoyed_user = models.ForeignKey(User, related_name='blocker', on_delete=models.CASCADE)
    users = models.ManyToManyField(User, related_name='blocked_by')

    @classmethod
    def block_user(cls, annoyed_user, new_blocked):
        blocked, _ = cls.objects.get_or_create(
            annoyed_user=annoyed_user
        )
        blocked.users.add(new_blocked)

    @classmethod
    def unblock_user(cls, annoyed_user, old_blocked):
        blocked, _ = cls.objects.get_or_create(
            annoyed_user=annoyed_user
        )
        blocked.users.remove(old_blocked)

    @classmethod
    def is_blocked(cls, annoyed_user, other_user):
        blocked, _ = cls.objects.get_or_create(
            annoyed_user=annoyed_user
        )
        return blocked.users.filter(id=other_user.id).exists()


class Tournament(models.Model):
    name = models.CharField(max_length=255, default="super-pong-tournament")
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField(null=True, blank=True)
    on_blockchain = models.BooleanField(default=False)
    player_limit = models.IntegerField(default=16)
    prize = models.IntegerField(default=0)
    registration_fee = models.IntegerField(default=0)
    winner = models.ForeignKey(Profile, null=True, blank=True, on_delete=models.SET_NULL, related_name='tournaments_won')
    final_result = models.TextField(blank=True)

    def __str__(self):
        return self.name

    def is_full(self):
        return self.participants.count() >= self.player_limit

    def is_over(self):
        return self.end_date < timezone.now()

    def get_players(self):
        return self.participants.all()

    def add_player(self, player):
        TournamentPlayer.objects.create(tournament=self, player=player)

    def remove_player(self, player):
        TournamentPlayer.objects.get(tournament=self, player=player).delete()

    def get_matches(self):
        return self.matches.all()

    def add_match(self, match):
        match.tournament = self
        match.save()



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

    class Meta:
        unique_together = ('tournament', 'player')

    def __str__(self):
        return f"{self.player} in tournament: {self.tournament}"

