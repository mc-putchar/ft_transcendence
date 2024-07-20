from django.db import models
from django.contrib.auth.models import User

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

    def is_friend(current_user, other_user):
        if other_user in self.users:
            return True
        return False


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

    def is_blocked(annoyed_user, other_user):
        if other_user in self.users:
            return True
        return False


class Match(models.Model):
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.player1} vs {self.player2} on {self.date}"


class PlayerMatch(models.Model):
    match = models.ForeignKey(Match, on_delete=models.CASCADE)
    player = models.ForeignKey(Profile, on_delete=models.CASCADE)
    score = models.IntegerField()
    winner = models.BooleanField()

    class Meta:
        unique_together = ('match', 'player')

    def __str__(self):
        return f"{self.player} in match {self.match} scored {self.score}"


class Tournament(models.Model):
    players = models.ManyToManyField(Profile, related_name='players')
    matches = models.ManyToManyField(Match, related_name='matches')

# class Message
