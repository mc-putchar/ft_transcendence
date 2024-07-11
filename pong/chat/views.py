from django.shortcuts import render
from django.http import JsonResponse
from django.db import transaction
from .models import Lobby
from django.template.loader import render_to_string

def index(request):

    lobby, created = Lobby.objects.get_or_create(pk=1)
    lobby.add_user(request.user.username)
 
    context = {
        'user': request.user,
        'userlist': lobby.userlist.strip().split()  # Converting userlist to a list
    }

    data = {
        'title': 'Chat',
        'content': render_to_string('chat/index.html', request=request, context=context),
    }

    return JsonResponse(data)

