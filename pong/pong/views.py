import json
import logging
import random
import string

import requests
from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth import login as django_login
from django.contrib.auth import logout as django_logout  # Import logout
from django.contrib.auth.models import User
from django.http import HttpResponse, JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.template.loader import render_to_string

from api.models import Friend, Profile

from .auth42 import exchange_code_for_token, get_user_data
from .forms import LoginForm, ProfileUpdateForm, UserUpdateForm

logger = logging.getLogger(__name__)


def index(request):
    user_data = request.session.get('user_data', {})

    context = {
        'user': request.user,
        'username': user_data.get('login', request.user.username)
    }
    return render(request, 'index.html', context)


def get_friends(user):
    friend_instance, created = Friend.objects.get_or_create(current_user=user)
    friends = []
    for friend in friend_instance.users.all():
        profile, created = Profile.objects.get_or_create(user=friend)
        friends.append(profile)
    return friends


def home_data(request):
    if request.user.is_authenticated:
        if request.user.profile.isOnline:
            status = "Online"
        else:
            status = "Offline"
        user_data = {
            'login': request.user.username,
            'email': str(request.user.username) + "@42.pong",
            'image': request.user.profile.image.url,
            'alias': request.user.profile.alias,
            'status': status,
            'friends': get_friends(request.user),
        }
        context = {'user_data': user_data}
        content = render_to_string('user_info.html', context=context)
        data = {'title': 'Home', 'content': content}
    else:
        html = render_to_string(
            'registration/needlogin.html', request=request)
        data = {"title": "Online", "content": html}

    return JsonResponse(data)


def show_profile(request, username):
    user = get_object_or_404(Profile, user__username=username)
    if user.isOnline:
        status = 'Online'
    else:
        status = 'Offline'

    logger.critical("Profile: " + str(user))

    context = {
        'user': user,
        'status': status,
        'profilepic': user.image.url
    }
    content = render_to_string('profile.html', context=context)
    data = {'title': 'Profile', 'content': content}
    return JsonResponse(data)


def update_profile(request):
    if request.method == 'POST':
        u_form = UserUpdateForm(request.POST, instance=request.user)
        p_form = ProfileUpdateForm(
            request.POST, request.FILES, instance=request.user.profile)
        if u_form.is_valid() and p_form.is_valid():
            u_form.save()
            p_form.save()
    else:
        u_form = UserUpdateForm(instance=request.user)
        p_form = ProfileUpdateForm(instance=request.user.profile)

    context = {
        'u_form': u_form,
        'p_form': p_form,
        'username': request.user.username,
        'profilepic': request.user.profile.image.url
    }
    if request.method == 'POST':
        data = {'image': request.user.profile.image.url}
    else:
        content = render_to_string('update_profile.html', context=context)
        data = {'title': 'Profile', 'content': content}
    return JsonResponse(data)


def users(request):
    if request.user.is_authenticated:
        users = Profile.objects.all()
        context = {'users': users}
        content = render_to_string('list_users.html', context=context)
        data = {'title': 'Users', 'content': content}

    else:
        html = render_to_string(
            'registration/needlogin.html', request=request)
        data = {"title": "Online", "content": html}

    return JsonResponse(data)


def profile(request):
    if request.method == 'POST':
        u_form = UserUpdateForm(request.POST, instance=request.user)
        p_form = ProfileUpdateForm(
            request.POST, request.FILES, instance=request.user.profile)
        if u_form.is_valid() and p_form.is_valid():
            u_form.save()
            p_form.save()
    else:
        u_form = UserUpdateForm(instance=request.user)
        p_form = ProfileUpdateForm(instance=request.user.profile)

    context = {
        'u_form': u_form,
        'p_form': p_form
    }
    content = render_to_string('profile.html', context=context)
    data = {'title': 'Profile', 'content': content}
    return JsonResponse(data)


def local_game(request):
    data = {"title": 'local', 'content': render_to_string("local_game.html")}
    return JsonResponse(data)


def contact_data(request):
    data = {"title": "Contact", "content": "Welcome to the Contact Page"}
    return JsonResponse(data)


def online(request):
    if not request.user.is_authenticated:
        html = render_to_string('registration/needlogin.html', request=request)
        data = {"title": "Online", "content": html}
        return JsonResponse(data, safe=False)

    profile = request.user.profile

    html = render_to_string('online_game.html', request=request, context={
                            "profile": profile})

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

    request.user.profile.set_online_status(False)
    request.user.profile.save()

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
                request.user.profile.set_online_status(False)
                request.user.profile.save()

                data = {"title": "Login", "content": "Login successful"}
                return JsonResponse(data)
            else:
                data = {"title": "Login",
                        "content": "Invalid username or password"}
                return JsonResponse(data, status=400)

        else:
            data = {"title": "Login", "content": "Form validation failed"}
            return JsonResponse(data, status=400)

    else:
        form = LoginForm()
        html_form = render_to_string(
            'partial.html', {'form': form}, request=request)
        data = {"title": "Login", "content": html_form}
        return JsonResponse(data)


def register(request):
    if request.method == 'POST':
        email = request.POST['email']
        username = request.POST['username']
        password = request.POST['password1']

        user = User.objects.create_user(
            username=username, password=password, email=email)
        user.save()

        if user is not None:
            django_login(request, user)

        return JsonResponse({"title": "Register", "content": "Registration successful"})
    else:
        form_html = render_to_string(
            'registration/register.html', {}, request=request)
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

    if state != session_state:
        return HttpResponse('Invalid state parameter', status=400)

    redirect_uri = settings.REDIRECT_URI
    access_token = exchange_code_for_token(code, redirect_uri)

    if access_token:
        request.session['access_token'] = access_token
        user_data = get_user_data(access_token)
        if user_data:
            request.session['user_data'] = user_data
            username = user_data.get('login')
            email = user_data.get('email')
            image_url = user_data.get('image')
            user, created = User.objects.get_or_create(
                username=username, defaults={'email': email})

            profile, created = Profile.objects.get_or_create(
                user=user, defaults={'alias': username})

            if not created:
                profile.alias = username

            # takes the intra profile picture and adds it as a Profile user
            if created and image_url:
                response = requests.get(image_url['versions']['medium'])
                if response.status_code == 200:
                    image_path = f'profile_images/{username}.png'
                    with open(f'media/{image_path}', 'wb') as f:
                        f.write(response.content)
                    profile.image.url = image_path

            profile.save()
            django_login(request, user)
            return redirect('/')
        else:
            return HttpResponse('No user data returned', status=404)
    else:
        return HttpResponse('Failed to exchange code for access token', status=400)
