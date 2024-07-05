import secrets
import requests
from django.http import HttpResponse
from django.conf import settings
from django.shortcuts import render, redirect
from django.template import loader
import logging

from .auth import exchange_code_for_token, get_user_data

logger = logging.getLogger('django')
redirect_uri = settings.REDIRECT_URI

def game(request):
    template = loader.get_template('game.html')
    return HttpResponse(template.render({}, request))

def index(request):
    template = loader.get_template('index.html')
    return HttpResponse(template.render({}, request))

def login(request):
    state = secrets.token_urlsafe(32)
    request.session['oauth_state'] = state  # Save the state in session for CSRF protection
    client_id = settings.CLIENT_ID
    auth_url = f"https://api.intra.42.fr/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}&response_type=code&scope=public"

    auth_url_with_state = f"{auth_url}&state={state}"
    return redirect(auth_url_with_state)

def loginExternal(request):
    return render(request, 'registration/login.html')

def main(request):
    return render(request,"main.html")

def enter(request):
    # TODO - add a non 42 user login 
    user_data = request.session.get('user_data')
    if user_data:
        display_name = user_data['displayname']
        login = user_data['login']
        return render(request, 'main.html', {'display_name': display_name, 'login': user_data['login']})
    else:
        return HttpResponse('Not authenticated', status=401)

def redirect_view(request):         # Renamed to avoid conflict with `redirect` function from `django.shortcuts`
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
            request.session['user_data'] = user_data
            return render(request, template, {'user_data': user_data})
        else:
            return HttpResponse('No user data returned', status=404)
    else:
        return HttpResponse('Failed to exchange code for access token', status=400)

def users(request):
    users = User.objects.all().values()
    template = loader.get_template('users.html')
    context = {
        'users': users,
    }
    return HttpResponse(template.render(context, request))

def profile(request, id):
    user = AbstractUser.objects.get(id=id)
    template = loader.get_template('profile.html')
    context = {
        'user': users,
    }
    return HttpResponse(template.render(context, request))
