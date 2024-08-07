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

from api.models import Profile, PlayerMatch, Friend, Blocked, Tournament, TournamentPlayer
from game.serializers import PlayerSerializer
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
        case 'home' | 'navbar' | 'chat':
            template = loader.get_template(f"{template_name}.html")
            context = user_data
        case 'dashboard' | 'online-game':
            template = loader.get_template(f"{template_name}.html")
            username = user_data['user'].username
            context = get_user_info(request, username)
        case 'profile':
            template = loader.get_template('profile.html')
            context = update_profile(request, user_data)
        case 'leaderboard':
            template = loader.get_template('leaderboard.html')
            users = Profile.objects.all()
            users = sorted(users, key=lambda x: x.matches_won(), reverse=True)
            users = list(map(lambda x: {
                'username': x.user.username,
                'alias': x.alias,
                'profilepic': x.image.url,
                'matches_won': x.matches_won(),
            }, users))
            context = { 'users': users }
        case 'tournaments':
            logger.info('Tournaments')
            template = loader.get_template('tournaments.html')
            context = user_data
            context['tournaments'] = Tournament.objects.filter(status='open')
            context['t_form'] = CreateTournamentForm()
        case _:
            try:
                template = loader.get_template(f"{template_name}.html")
            except:
                template = loader.get_template("404.html")
    return HttpResponse(template.render(context, request=request))

def profiles(request, username):
    user_data = get_user_from_token(request)
    context = get_user_info(request, username)
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

    is_me = profile.user.id == user.id
    is_friend = user.profile.is_friend(profile.user)
    is_blocked = user.profile.is_blocked(profile.user)

    played = PlayerMatch.objects.filter(player=profile).order_by('-match__date')
    wins = played.filter(winner=True).count()
    losses = played.count() - wins
    match_stats = {
        'played': played.count(),
        'wins': wins,
        'losses': losses,
    }
    friends = profile.get_friends()
    friends = list(map(lambda x: {
        'username': x.username,
        'isOnline': x.profile.isOnline,
        'profilepic': x.profile.image.url,
    }, friends))
    serializer = PlayerSerializer(profile)
    context = {
        'username': profile.user.username,
        'profile': serializer.data,
        'status': status,
        'is_me': is_me,
        'is_friend': is_friend,
        'is_blocked': is_blocked,
        'friends': friends,
        'match_stats': match_stats,
        'match_history': played,
        'tournament_history': TournamentPlayer.objects.filter(player=profile, tournament__status='closed')
    }
    logger.info(context)
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
    context['is_joined'] = tournament.is_player(user_data['user'])
    context['participants'] = tournament.get_players()
    if tournament.creator:
        try:
            creator = Profile.objects.get(id=tournament.creator.id)
            context['is_creator'] = creator.user == user_data['user']
            context['creator'] = creator
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
