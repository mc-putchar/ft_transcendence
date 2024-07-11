from django.contrib.auth.models import User
from django.contrib.auth import login as django_login
from django.shortcuts import render, redirect
from django.http import JsonResponse, HttpResponse
from .forms import LoginForm, RegisterForm
from django.template.loader import render_to_string
from django.contrib.auth import logout as django_logout  # Import logout
from .auth42 import exchange_code_for_token, get_user_data
from django.conf import settings
from django.contrib.auth import authenticate
from django.views.decorators.csrf import csrf_exempt

import secrets
import logging
import random
import string

logger = logging.getLogger(__name__)


def index(request):
    user_data = request.session.get('user_data', {})

    context = {
        'user': request.user,
        'username': user_data.get('login', request.user.username)
    }

    return render(request, 'index.html', context)


def home_data(request):
    user_data = request.session.get('user_data')
    if user_data is not None:
        # Ensure the user_data is a dictionary
        context = {'user_data': user_data}
        content = render_to_string('user_info.html', context=context)
        data = {'title': 'Home', 'content': content}
    else:
        if request.user.is_authenticated:
            user_data = {
                'login': request.user.username, 'email': str(request.user.username) + "@42.pong"}
            context = {'user_data': user_data}
            content = render_to_string('user_info.html', context=context)
            data = {'title': 'Home', 'content': content}
        else:
            data = {"title": "Home", "content": "Welcome to the Home Page"}

    return JsonResponse(data)


def local_game(request):
    # data = {"title": "Local", "content": "Play in the same computer"}
    data = {"title": 'local', 'content': render_to_string("local_game.html")}

    return JsonResponse(data)


def contact_data(request):
    data = {"title": "Contact", "content": "Welcome to the Contact Page"}
    return JsonResponse(data)


def online(request):

    if not request.user.is_authenticated:
        # render please login view template
        html = render_to_string('registration/needlogin.html', request=request)
        data = {"title": "Online", "content": html}
        return JsonResponse(data, safe=False)

    username = request.user.username

    html = render_to_string('online_game.html', request=request, context={"username": username})

    data = {"title": "Online", "content": html}
    return JsonResponse(data, safe=False)


def logout(request):
    if request.method == 'POST':
        django_logout(request)
    template = render_to_string('registration/logout.html', request=request)
    data = {
        "title": "Logout",
        "content": template,
    }
    return JsonResponse(data)


def login(request):
    if request.method == 'POST':
        form = LoginForm(request.POST)
        
        if form.is_valid():
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']
            user = authenticate(username=username, password=password)
          
            if user is not None:
                django_login(request, user)
                data = {"title": "Login", "content": "Login successful"}
                return JsonResponse(data)
            else:
                data = {"title": "Login", "content": "Invalid username or password"}
                return JsonResponse(data, status=400)
        
        else:
            data = {"title": "Login", "content": "Form validation failed"}
            return JsonResponse(data, status=400)
    
    else:
        form = LoginForm()
        html_form = render_to_string('partial.html', {'form': form}, request=request)
        data = {"title": "Login", "content": html_form}
        return JsonResponse(data)

def register(request):
    if request.method == 'POST':
        email = request.POST['email']
        username = request.POST['username']
        password= request.POST['password1']

        user = User.objects.create_user(username = username , password = password , email = email)
        user.save()

        if user is not None:
            django_login(request, user)

        return JsonResponse({"title": "Register", "content": "Registration successful"})
    else:
        form_html = render_to_string('registration/register.html', {}, request=request)
        return JsonResponse({"title": "Register", "content": form_html})

def generate_state():
    return ''.join(random.choices(string.ascii_letters + string.digits, k=16))

def auth42(request):
    state = generate_state()
    request.session['oauth_state'] = state
    client_id = settings.CLIENT_ID
    redirect_uri = settings.REDIRECT_URI
    auth_url = f"https://api.intra.42.fr/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}&response_type=code&scope=public&state={state}"
    return redirect(auth_url)

def redirect_view(request):
    code = request.GET.get('code')
    state = request.GET.get('state')
    session_state = request.session.get('oauth_state')
    logger.info(f"Received state: {state}, session state: {session_state}")

    if state != session_state:
        return HttpResponse('Invalid state parameter', status=400)

    redirect_uri = settings.REDIRECT_URI
    access_token = exchange_code_for_token(code, redirect_uri)
    logger.info(f"Access token: {access_token}")

    if access_token:
        request.session['access_token'] = access_token
        user_data = get_user_data(access_token)
        if user_data:
            request.session['user_data'] = user_data

            # Get or create the Django user
            # assuming 'login' is the username field from 42 API
            username = user_data.get('login')
            email = user_data.get('email')
            user, created = User.objects.get_or_create(
                username=username, defaults={'email': email})

            django_login(request, user)

            return redirect('/')
        else:
            return HttpResponse('No user data returned', status=404)
    else:
        return HttpResponse('Failed to exchange code for access token', status=400)
