from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    alias = models.CharField(max_length=150, default='alias')
    friendList = models.TextField(default="[]")
    isOnline = models.BooleanField(default=False)
    image = models.ImageField(upload_to='profile_images', default='profile_images/default.png')

    def __str__(self):
        return f'{self.user.username} Profile'

    def set_online_status(self, status):
        self.isOnline = status
        self.save()


class Friend(models.Model):
    current_user = models.ForeignKey(User, related_name='owner', on_delete=models.CASCADE)
    users = models.ManyToManyField(User, related_name='friends')

    @classmethod
    def make_friend(cls, current_user, new_friend):
        friend, created = cls.objects.get_or_create(
            current_user=current_user
        )
        friend.users.add(new_friend)

    # Forever alone
    @classmethod
    def lose_friend(cls, current_user, old_friend):
        friend, created = cls.objects.get_or_create(
            current_user=current_user
        )
        friend.users.remove(old_friend)

    @classmethod
    def is_friend(current_user, other_user):
        friend, created = cls.objects.get_or_create(
            current_user=current_user
        )
        return other_user in friend.users


class Blocked(models.Model):
    annoyed_user = models.ForeignKey(User, related_name='blocker', on_delete=models.CASCADE)
    users = models.ManyToManyField(User, related_name='blocked')

    @classmethod
    def block_user(cls, annoyed_user, new_blocked):
        blocked, created = cls.objects.get_or_create(
            annoyed_user=annoyed_user
        )
        blocked.users.add(new_blocked)

    @classmethod
    def unblock_user(cls, annoyed_user, old_blocked):
        blocked, created = cls.objects.get_or_create(
            annoyed_user=annoyed_user
        )
        blocked.users.remove(old_blocked)

    @classmethod
    def is_blocked(annoyed_user, other_user):
        blocked, created = cls.objects.get_or_create(
            annoyed_user=annoyed_user
        )
        return other_user in blocked.users


class Tournament(models.Model):
    name = models.CharField(max_length=255, default="super-pong-tournament")
    start_date = models.DateTimeField(default=timezone.now)
    on_blockchain = models.BooleanField(default=False)

    def __str__(self):
        return self.name


class Match(models.Model):
    tournament = models.ForeignKey(Tournament, null=True, blank=True, on_delete=models.CASCADE, related_name='matches')
    date = models.DateTimeField(auto_now_add=True)
    players = models.IntegerField(default=0)

    def __str__(self):
        return f"Match on {self.date}"


class PlayerMatch(models.Model):
    match = models.ForeignKey(Match, on_delete=models.CASCADE)
    player = models.ForeignKey(Profile, on_delete=models.CASCADE)
    score = models.IntegerField(default=0)
    winner = models.BooleanField(default=False)

    class Meta:
        unique_together = ('match', 'player')

    def __str__(self):
        return f"{self.player} in match {self.match} scored {self.score}"


class TournamentPlayer(models.Model):
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='participants')
    player = models.ForeignKey(Profile, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('tournament', 'player')

    def __str__(self):
        return f"{self.player} in tournament {self.tournament}"

