from django.shortcuts import render
from django.http import JsonResponse
from django.db import transaction
from .models import Lobby
from api.models import Profile
from django.template.loader import render_to_string

import logging

logger = logging.getLogger(__name__)


def index(request):

    lobby, created = Lobby.objects.get_or_create(
        id=1, defaults={'num_players': 0, 'userlist': ''})

    if created:
        logger.debug("\nCREATED:\nLobby: %s", lobby)

    # add this user to the lobby
    lobby.add_user(request.user.username)

    context = {
        'profile': request.user.profile,
        'userslist': lobby.userlist,
    }

    data = {
        'title': 'Chat',
        'content': render_to_string('chat/index.html', request=request, context=context),
    }

    return JsonResponse(data)
