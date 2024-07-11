from django.http import JsonResponse
# render to string
from django.template.loader import render_to_string

def index(request):

    data = {
        'title': 'Chat',
        'content': render_to_string('chat/index.html', request=request),
    }
    return JsonResponse(data)

