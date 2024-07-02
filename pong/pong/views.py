import secrets
import requests
from django.http import HttpResponse
from django.conf import settings
from django.shortcuts import render, redirect
from django.template import loader
import logging

logger = logging.getLogger('django')
redirect_uri = settings.REDIRECT_URI

from .models import User

def index(request):
    template = loader.get_template('index.html')
    return HttpResponse(template.render({}, request))

def chat(request):
    return render(request, 'chat/lobby.html')

def room(request, room_name):
    return render(request, "chat/room.html", {"room_name": room_name})

def login(request):
    state = secrets.token_urlsafe(32)
    request.session['oauth_state'] = state  # Save the state in session for CSRF protection
    client_id = settings.CLIENT_ID
    auth_url = f"https://api.intra.42.fr/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}&response_type=code&scope=public"

    auth_url_with_state = f"{auth_url}&state={state}"
    return redirect(auth_url_with_state)

def redirect_view(request):  # Renamed to avoid conflict with `redirect` function from `django.shortcuts`
    template = 'student_info.html'
    code = request.GET.get('code')
    state = request.GET.get('state')
    saved_state = request.session.pop('oauth_state', None)

    if state != saved_state:
        return HttpResponse('State mismatch. Possible CSRF attack.', status=400)

    access_token = exchange_code_for_token(code, redirect_uri)

    if access_token:
        request.session['access_token'] = access_token
        user_data = get_user_data(access_token)
        
        if user_data:
            return render(request, template, {'user_data': user_data})
        else:
            return HttpResponse('No user data returned', status=404)
    else:
        return HttpResponse('Failed to exchange code for access token', status=400)

def exchange_code_for_token(code, redirect_uri):
    token_url = 'https://api.intra.42.fr/oauth/token'

    data = {
        'grant_type': 'authorization_code',  # Fixed the grant type
        'client_id': settings.CLIENT_ID,
        'client_secret': settings.CLIENT_SECRET,
        'code': code,
        'redirect_uri': settings.REDIRECT_URI
    }

    response = requests.post(token_url, data=data)
    if response.status_code == 200:
        return response.json().get('access_token')
    else:
        logger.error(f"Token exchange failed: {response.status_code} - {response.text}")
        return None

def get_user_data(access_token):
    headers = {'Authorization': f'Bearer {access_token}'}
    response = requests.get('https://api.intra.42.fr/v2/me', headers=headers)
    
    if response.status_code == 200:
        return response.json()
    else:
        logger.error(f"Failed to retrieve user data: {response.status_code} - {response.text}")
        return None

def users(request):
    users = User.objects.all().values()
    template = loader.get_template('users.html')
    context = {
        'users': users,
    }
    return HttpResponse(template.render(context, request))

def profile(request, id):
    user = User.objects.get(id=id)
    template = loader.get_template('profile.html')
    context = {
        'user': users,
    }
    return HttpResponse(template.render(context, request))
