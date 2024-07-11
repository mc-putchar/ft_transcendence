from django.db import models

class Lobby(models.Model):
    userlist = models.TextField()
    num_players = models.IntegerField()
 
    # reset the userlist and num_players at start of the server
    def __init__(self, *args, **kwargs):
        super(Lobby, self).__init__(*args, **kwargs)
        self.userlist = ""
        self.num_players = 0

    def __str__(self):
        return self.userlist

    def add_user(self, user):
        if user not in self.userlist:
            self.userlist += user + " "
            self.num_players += 1
            self.save()

    def remove_user(self, user):
        self.userlist = self.userlist.replace(user + " ", "")
        self.num_players -= 1
        self.save()

