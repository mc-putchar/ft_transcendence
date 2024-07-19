from django.contrib import admin
from .models import Profile, Friend, Match, PlayerMatch, Tournament

admin.site.register(Profile)
admin.site.register(Friend)
admin.site.register(Match)
admin.site.register(PlayerMatch)
admin.site.register(Tournament)
