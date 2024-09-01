import logging
import random
import string
import requests

from django.conf import settings
from django.contrib.auth.models import User
from django.core.files.images import ImageFile
from django.http import HttpResponse, JsonResponse
from django.shortcuts import redirect, render
from django.template import loader

from rest_framework_simplejwt.tokens import RefreshToken

from api.models import Profile, PlayerMatch, Tournament, TournamentPlayer
from game.serializers import PlayerSerializer
from .forms import ProfileUpdateForm, UserUpdateForm, ChangePasswordForm, UsernameCollisionForm
from game.forms import CreateTournamentForm

from .auth42 import exchange_code_for_token, get_user_data
from .context_processors import get_user_from_token, get_user_from_validated_token

logger = logging.getLogger(__name__)

def index(request):
    context = get_user_from_token(request)
    return render(request, 'index.html', context)

def templates(request, template_name):
    context = {}
    match template_name:
        case 'home' | 'navbar' | 'chat':
            context = get_user_from_token(request)
        case 'dashboard' | 'online-game':
            user = get_user_from_token(request)['user']
            if user:
                context = get_user_info(request, user.username)
        case 'profile':
            user_data = get_user_from_token(request)
            if user_data['user']:
                context = update_profile(request, user_data['user'])
        case 'scoreboard':
            user_data = get_user_from_token(request)
            if user_data['user']:
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
            user_data = get_user_from_token(request)
            if user_data['user']:
                context = user_data
                context['tournaments'] = Tournament.objects.all()
                context['t_form'] = CreateTournamentForm()
        case 'username_collision':
            template_name = 'username_collision'
            error_html = '<p>Username already exists</p><button onclick="window.history.back()">Go back</button>'
            if request.method == 'POST':
                u_form = UsernameCollisionForm(request.POST)
                if u_form.is_valid():
                    username = u_form.cleaned_data['username']
                    email = request.POST['email']
                    forty_two_id = request.POST['forty_two_id']
                    image_url = request.POST['image_url']
                    user, created = create_42user(username, email, forty_two_id, image_url)
                    if created:
                        refresh = RefreshToken.for_user(user)
                        access_token = str(refresh.access_token)
                        refresh_token = str(refresh)
                        context = {
                            'access_token': access_token,
                            'refresh_token': refresh_token,
                            'user': get_user_from_validated_token(access_token),
                        }
                    else:
                        return HttpResponse(error_html, status=400)
                else:
                    return HttpResponse(error_html, status=400)
    try:
        template = loader.get_template(f"{template_name}.html")
    except:
        template = loader.get_template("404.html")
    return HttpResponse(template.render(context, request=request))

def profiles(request, username):
    context = get_user_info(request, username)
    if context:
        template = loader.get_template("user-profile.html")
    else:
        template = loader.get_template("404.html")
    return HttpResponse(template.render(context, request=request))

def get_user_info(request, username):
    user_data = get_user_from_token(request)
    user = user_data['user']
    if not user:
        return None
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
        'user': user,
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
    # logger.info(context)
    return context

def update_profile(request, user):
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
    if user_data['user']:
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

def create_42user(username, email, forty_two_id, image_url):
    user, created = User.objects.get_or_create(
        username=username, defaults={'email': email})
    if created:
        user.set_unusable_password()
        profile = user.profile
        profile.forty_two_id = forty_two_id
        profile.alias = username
        if profile.image.name == 'profile_images/default.png' and image_url:
            response = requests.get(image_url)
            if response.status_code == 200:
                image_path = f'profile_images/{username}.png'
                with open(f'media/{image_path}', 'wb') as f:
                    f.write(response.content)
                profile.image = image_path
        profile.save()
    return user, created

def redirect_view(request):
    code = request.GET.get('code')
    state = request.GET.get('state')
    session_state = request.session.get('oauth_state')

    if state != session_state:
        logger.warn(f"Invalid state parameter: {state} != {session_state}")
        return HttpResponse('Invalid state parameter', status=400)

    redirect_uri = settings.REDIRECT_URI
    access_token = exchange_code_for_token(code, redirect_uri)

    if access_token:
        user_data = get_user_data(access_token)
        if user_data:
            username = user_data.get('login')
            email = user_data.get('email')
            image_url = user_data.get('image')
            forty_two_id = user_data.get('id')

            try:
                profile = Profile.objects.get(forty_two_id=forty_two_id)
                user = profile.user
            except Profile.DoesNotExist:
                image_url = image_url['versions']['medium']
                user, created = create_42user(username, email, forty_two_id, image_url)
                if not created:
                    context = {
                        'username': username,
                        'email': email,
                        'forty_two_id': forty_two_id,
                        'image_url': image_url,
                        'u_form': UsernameCollisionForm(),
                    }
                    return render(request, 'username_collision.html', context)

            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            context = {
                'access_token': access_token,
                'refresh_token': refresh_token,
                'is_popup': request.COOKIES.get('is_popup') == 'true',
            }
            response = render(request, 'oauth_callback.html', context)
            response.delete_cookie('is_popup')
            return response
        else:
            return HttpResponse('No user data returned', status=404)
    else:
        return HttpResponse('Failed to exchange code for access token', status=400)
