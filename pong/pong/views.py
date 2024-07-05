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
    return binascii.hexlify(os.urandom(16)).decode()


def base_template(request):
    return render(request, 'base.html')


def get_template_content(request):
    template_name = request.GET.get('template_name')
    html_content = render_to_string(template_name, request.GET.dict())
    return JsonResponse({'html': html_content})


def game(request):
    html_content = render_to_string('game.html')
    return JsonResponse({'html': html_content})


def index(request):
    html_content = render_to_string('index.html')
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
    if request.method == 'POST':
        form = LoginForm(request.POST)
        if form.is_valid():
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']
            user = authenticate(request, username=username, password=password)
            if user is not None:
                auth_login(request, user)
                return redirect('enter')
            else:
                return HttpResponse('Invalid login', status=401)

    return JsonResponse({'html': render_to_string('registration/login.html', {'display_name': username, 'login': username})})


def main(request):
    user_data = request.session.get('user_data')
    if user_data:
        display_name = user_data['displayname']
        html_content = render_to_string(
            'main.html', {'display_name': display_name, 'login': user_data['login']})
        return JsonResponse({'html': html_content})
    else:
        return HttpResponse('Not authenticated', status=401)


def enter(request):
    user_data = request.session.get('user_data')
    if user_data:
        display_name = user_data['displayname']
        html_content = render_to_string(
            'main.html', {'display_name': display_name, 'login': user_data['login']})
        return HttpResponse(html_content)
    else:
        return HttpResponse('Not authenticated', status=401)


def redirect_view(request):
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
            html_content = render_to_string(template, {'user_data': user_data})
            return HttpResponse(html_content)
        else:
            return HttpResponse('No user data returned', status=404)
    else:
        return HttpResponse('Failed to exchange code for token', status=400)
