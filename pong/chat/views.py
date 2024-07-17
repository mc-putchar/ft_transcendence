import logging

from api.models import Profile
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

    lobby.add_user(request.user.username)
    
    csrf_token = request.META.get('CSRF_COOKIE', None)

    context = {
        'profile': request.user.profile,
        'userslist': lobby.userlist,
        'room_name': 'lobby',
        'csrf_token': csrf_token,
    }

    data = {
        'title': "lobby" + ' Chat',
        'content': render_to_string('chat_index.html', request=request, context=context),
    }

    logger.info("\nDATA:\n%s", data)
    return JsonResponse(data)



def room(request, room_name):

    lobby, created = Lobby.objects.get_or_create(
        id=1, defaults={'num_players': 0, 'userlist': ''})

    if created:
        logger.debug("\nCREATED:\nLobby: %s", lobby)

    # add this user to the lobby
    lobby.add_user(request.user.username)
    
    csrf_token = request.META.get('CSRF_COOKIE', None)

    context = {
        'profile': request.user.profile,
        'userslist': lobby.userlist,
        'room_name': room_name,
        'csrf_token': csrf_token,
    }

    data = {
        'title': room_name + ' Chat',
        'content': render_to_string('chat_index.html', request=request, context=context),
    }

    logger.info("\nDATA:\n%s", data)

    return JsonResponse(data)







