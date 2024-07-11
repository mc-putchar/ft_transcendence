from django.shortcuts import render
from django.http import JsonResponse
from django.db import transaction
from .models import Lobby
from django.template.loader import render_to_string


def index(request):

    lobby, created = Lobby.objects.get_or_create(
        id=1, defaults={'num_players': 0, 'userlist': ''})

    # Use a transaction to safely update the lobby instance
    with transaction.atomic():
        lobby.num_players += 1
        lobby.userlist += request.user.username + " "
        lobby.save()

    context = {
        'user': request.user,
        'userlist': lobby.userlist.strip().split()  # Converting userlist to a list
    }

    data = {
        'title': 'Chat',
        'content': render_to_string('chat/index.html', request=request, context=context),
    }

    return JsonResponse(data)
