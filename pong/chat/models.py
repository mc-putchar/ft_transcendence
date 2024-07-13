from django.db import models
import json

class Lobby(models.Model):
    userlist = models.TextField(default="[]")
    num_players = models.IntegerField(default=0)

    def __str__(self):
        return ", ".join(self.get_userlist())

    def get_userlist(self):
        try:
            return json.loads(self.userlist)
        except json.JSONDecodeError:
            return []

    def set_userlist(self, userlist):
        self.userlist = json.dumps(userlist)

    def add_user(self, user):
        users = self.get_userlist()
        if user not in users:
            users.append(user)
            self.set_userlist(users)
            self.num_players = len(users)
            self.save()

    def remove_user(self, user):
        users = self.get_userlist()
        if user in users:
            users.remove(user)
            self.set_userlist(users)
            self.num_players = len(users)
            self.save()

