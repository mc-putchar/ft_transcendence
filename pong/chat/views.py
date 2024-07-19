import logging

from api.models import Profile
from django.http import JsonResponse
from django.template.loader import render_to_string
from api.models import Profile


logger = logging.getLogger(__name__)

def index(request):
    csrf_token = request.META.get('CSRF_COOKIE', None)

    context = {
        'profile': request.user.profile,
        'userslist': Profile.objects.filter(isOnline=True),
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

    csrf_token = request.META.get('CSRF_COOKIE', None)

    context = {
        'profile': request.user.profile,
        'userslist': Profile.objects.filter(isOnline=True),
        'room_name': room_name,
        'csrf_token': csrf_token,
    }

    data = {
        'title': room_name + ' Chat',
        'content': render_to_string('chat_index.html', request=request, context=context),
    }

    return JsonResponse(data)







