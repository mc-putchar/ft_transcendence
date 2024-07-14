import logging

from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import render
from django.template.loader import render_to_string

from .models import Lobby

logger = logging.getLogger(__name__)


def index(request):

    lobby, created = Lobby.objects.get_or_create(
        id=1, defaults={'num_players': 0, 'userlist': ''})

    if created:
        logger.debug("\nCREATED:\nLobby: %s", lobby)

    # add this user to the lobby
    lobby.add_user(request.user.username)

    context = {
        'user': request.user,
        'userslist': lobby.userlist,
        'room_name': 'lobby',
    }

    data = {
        'title': 'Chat',
        'content': render_to_string('chat/index.html', request=request, context=context),
    }

    return JsonResponse(data)

def room(request, room_name):

    lobby, created = Lobby.objects.get_or_create(
        id=1, defaults={'num_players': 0, 'userlist': ''})

    if created:
        logger.debug("\nCREATED:\nLobby: %s", lobby)

    # add this user to the lobby
    lobby.add_user(request.user.username)

    context = {
        'user': request.user,
        'userslist': lobby.userlist,
        'room_name': room_name,
    }

    data = {
        'title': 'Chat',
        'content': render_to_string('chat/index.html', request=request, context=context),
    }

    return JsonResponse(data)







