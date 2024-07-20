from django.contrib import admin
from .models import Profile, Friend, Blocked, Match, PlayerMatch, Tournament

admin.site.register(Profile)
admin.site.register(Friend)
admin.site.register(Blocked)
admin.site.register(Match)
admin.site.register(PlayerMatch)
admin.site.register(Tournament)
