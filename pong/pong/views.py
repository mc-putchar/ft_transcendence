import binascii
import os
import secrets
from django.http import HttpResponse, JsonResponse
from django.conf import settings
from django.shortcuts import render, redirect
from django.template.loader import render_to_string
import logging
from .auth import exchange_code_for_token, get_user_data

logger = logging.getLogger('django')
redirect_uri = settings.REDIRECT_URI

def generate_state():
    return secrets.token_hex(16)

def base_template(request):
    return render(request, 'base.html')

def get_template_content(request):
    template_name = request.GET.get('template_name')
    html_content = render_to_string(template_name, request.GET.dict())
    return JsonResponse({'html': html_content})


def login42(request):
    state = generate_state()
    request.session['oauth_state'] = state
    client_id = settings.CLIENT_ID
    auth_url = f"https://api.intra.42.fr/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}&response_type=code&scope=public"

    auth_url_with_state = f"{auth_url}&state={state}"
    return redirect(auth_url_with_state)


def authorize_view(request):
    request.session['oauth_state'] = state  # Store state in session
    authorization_url = f"https://oauth-provider.com/authorize?response_type=code&client_id=your-client-id&redirect_uri={redirect_uri}&state={state}"
    return redirect(authorization_url)


def loginExternal(request):
    username = request.user
    logger.debug(f'Username: {username}')
    if request.method == 'POST':
        form = LoginForm(request.POST)
        logger.debug(f'Form data: {form}')
        if form.is_valid():
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']
            user = authenticate(request, username=username, password=password)
            if user is not None:
                auth_login(request, user)
                # add the user to the session data
                request.session['user_data'] = {
                    'displayname': user.displayname,
                    'login': user.username
                }
                logger.debug(f'User data: {request.session["user_data"]}')
                render_to_string('main.html', {'display_name': user.displayname, 'login': user.username})
            else:
                return HttpResponse('Invalid login', status=401)

    # return JsonResponse({'html': render_to_string('registration/login.html', {'display_name': username, 'login': username})})
    return render(request, 'registration/login.html', {'display_name': username, 'login': username})

def main(request):
    user_data = request.session.get('user_data')
    logger.debug(f'User data: {user_data}')

    html_content = render_to_string('main.html', context={'user_data': user_data}) 
    return HttpResponse(html_content)
    # else:
    #     return HttpResponse('Not authenticated')

def enter(request):
    user_data = request.session.get('user_data')
    if user_data:
        display_name = user_data['displayname']
        html_content = render_to_string(
            'main.html', {'display_name': display_name, 'login': user_data['login']})
        return HttpResponse(html_content)
    else:
        return HttpResponse('Not authenticated', status=401)

def game(request):
    user_data = request.session.get('user_data')
    if user_data:
        display_name = user_data['displayname']
        html_content = render_to_string(
            'game.html', {'display_name': display_name, 'login': user_data['login']})
        return HttpResponse(html_content)
    else:
        return HttpResponse('Not authenticated', status=401)

def redirect_view(request):
    template = 'student_info.html'
    code = request.GET.get('code')
    state = request.GET.get('state')
    saved_state = request.session['oauth_state']
    # Debug logs
    logger.debug(f'Received code: {code}')
    logger.debug(f'Received state: {state}')
    logger.debug(f'Saved state from session: {saved_state}')

    # Check for missing parameters
    if not code or not state:
        logger.error('Missing code or state parameter.')
        return HttpResponse('Missing code or state parameter.', status=400)

    if state != saved_state:
        logger.error(
            f'State mismatch. Expected: {saved_state}, Received: {state}')
        return HttpResponse('State mismatch. Possible CSRF attack.', status=400)

    access_token = exchange_code_for_token(code, redirect_uri)

    if not access_token:
        logger.error('Failed to exchange code for access token.')
        return HttpResponse('Failed to exchange code for access token.', status=400)

    request.session['access_token'] = access_token
    user_data = get_user_data(access_token)

    if not user_data:
        logger.error('Failed to retrieve user data.')
        return HttpResponse('No user data returned.', status=404)

    request.session['user_data'] = user_data
    html_content = render_to_string(template, {'user_data': user_data})
    return HttpResponse(html_content)
