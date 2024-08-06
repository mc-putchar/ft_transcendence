import json
import logging
import random
import string

import requests
from django.conf import settings
from django.contrib.auth.models import User
from django.core.files.images import ImageFile
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.shortcuts import redirect, render
from django.template import loader

from api.models import Profile, PlayerMatch, Friend, Blocked, Tournament
from game.serializers import PlayerSerializer
from game.views import TournamentViewSet
from .forms import ProfileUpdateForm, UserUpdateForm, ChangePasswordForm
from game.forms import CreateTournamentForm
from .auth42 import exchange_code_for_token, get_user_data

from .context_processors import get_user_from_token

logger = logging.getLogger(__name__)

def index(request):
    context = { 'user': get_user_from_token(request) }
    return render(request, 'index.html', context)

def templates(request, template_name):
    user_data = get_user_from_token(request)
    context = {}
    match template_name:
        case 'home' | 'navbar':
            template = loader.get_template(f"{template_name}.html")
            context = user_data
        case 'profile':
            template = loader.get_template('profile.html')
            context = update_profile(request, user_data)
        case 'leaderboard':
            template = loader.get_template('leaderboard.html')
            users = Profile.objects.all()
            context = { 'users': users }
        case 'online-game':
            template = loader.get_template('online-game.html')
            context = get_user_info(request, user_data['user'].username)
        case 'tournaments':
            logger.info('Tournaments')
            template = loader.get_template('tournaments.html')
            context = user_data
            context['tournaments'] = Tournament.objects.filter(status='open')
            context['t_form'] = CreateTournamentForm()
        case 'chat':
            template = loader.get_template('chat.html')
            context = user_data
        case _:
            try:
                template = loader.get_template(f"{template_name}.html")
            except:
                template = loader.get_template("404.html")
    return HttpResponse(template.render(context, request=request))

def profiles(request, username):
    context = get_user_info(request, username)
    user_data = get_user_from_token(request)
    context['user'] = user_data['user']
    if context:
        template = loader.get_template("user-profile.html")
    else:
        template = loader.get_template("404.html")
    return HttpResponse(template.render(context, request=request))

def get_user_info(request, username):
    user_data = get_user_from_token(request)
    user = user_data['user']
    try:
        profile = Profile.objects.get(user__username=username)
    except Profile.DoesNotExist:
        return None
    status = 'Online' if profile.isOnline else 'Offline'

    is_me = user == profile.user
    is_friend = False if not is_me else Friend.is_friend(user, profile.user)
    is_blocked = False if not is_me else Blocked.is_blocked(user, profile.user)

    played = PlayerMatch.objects.filter(player=profile)
    wins = played.filter(winner=True).count()
    losses = played.count() - wins
    match_stats = {
        'played': played.count(),
        'wins': wins,
        'losses': losses,
    }
    serializer = PlayerSerializer(profile)
    context = {
        'username': profile.user.username,
        'profile': serializer.data,
        'status': status,
        'profilepic': profile.image.url,
        'is_me': is_me,
        'is_friend': is_friend,
        'is_blocked': is_blocked,
        'match_stats': match_stats,
    }
    return context

def update_profile(request, user_data):
    user = user_data['user']
    if request.method == 'POST':
        u_form = UserUpdateForm(request.POST, instance=user)
        p_form = ProfileUpdateForm(
            request.POST, request.FILES, instance=user.profile)
        cp_form = ChangePasswordForm(request.POST)
        if u_form.is_valid() and p_form.is_valid():
            u_form.save()
            p_form.save()
        if cp_form.is_valid():
            user.set_password(cp_form.cleaned_data['password'])
            user.save()
    else:
        u_form = UserUpdateForm(instance=user)
        p_form = ProfileUpdateForm(instance=user.profile)
        cp_form = ChangePasswordForm()

    context = {
        'u_form': u_form,
        'p_form': p_form,
        'username': user.username,
        'profilepic': user.profile.image.url
    }
    return context

def in_tournament(request, t_id):
    user_data = get_user_from_token(request)
    context = user_data
    try:
        tournament = Tournament.objects.get(id=t_id)
    except Tournament.DoesNotExist:
        return render(request, '404.html', context)
    context['tournament'] = tournament
    if tournament.creator:
        try:
            creator = Profile.objects.get(id=tournament.creator.id)
            context['is_creator'] = creator.user == user_data['user']
            context['creator'] = creator
            context['is_joined'] = tournament.participants.filter(id=user_data['user'].profile.id).exists()
        except Profile.DoesNotExist:
            creator = None
    return render(request, 'in-tournament.html', context)

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

            if created:
                user.profile.alias = username
                if user.profile.image.name == 'profile_images/default.png':
                    if image_url:
                        response = requests.get(image_url['versions']['medium'])
                        if response.status_code == 200:
                            image_path = f'profile_images/{username}.png'
                            with open(f'media/{image_path}', 'wb') as f:
                                f.write(response.content)
                            user.profile.image = image_path
                user.profile.save()

            return redirect('/')
        else:
            return HttpResponse('No user data returned', status=404)
    else:
        return HttpResponse('Failed to exchange code for access token', status=400)
