import secrets
import requests
from django.http import HttpResponse
from django.shortcuts import render, redirect
from django.template import loader
import os 
import logging
logger = logging.getLogger('django')
 
client_id = 'u-s4t2ud-a846f7a5b37f36564c465dfb6396c116cdb015b2e20e376b6ca7c81f86f117ad'
client_secret = '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'

def index(request):
    state = secrets.token_urlsafe(32)
    template = loader.get_template('index.html')
    return HttpResponse(template.render())

def redirect(request):
    logger.info('here goes your message')
    template = loader.get_template('online_students.html')

    code = request.GET.get('code')
    state = request.GET.get('state')
    saved_state = request.session.pop('oauth_state', None)

    logger.info(code)

    if state != saved_state:
        return HttpResponse('State mismatch. Possible CSRF attack.', status=400)

    redirect_uri = 'https://pong.ktano-studio.com/redirect'  # Replace with your actual redirect URI
    access_token = exchange_code_for_token(code, redirect_uri)

    if access_token is not None:
        request.session['access_token'] = access_token
        # make a request to the 42 API to get the user's data
        # v2/me is the endpoint to get the user's data
        user_data = get_user_data(access_token)
        logger.info(user_data)
        if user_data is not None:
            return HttpResponse(template.render({'user_data': user_data}))

        return HttpResponse(f'Got token {access_token}', status=200)
    return HttpResponse(template.render())

def exchange_code_for_token(code, redirect_uri):
    token_url = 'https://api.intra.42.fr/oauth/token'

    logger.info(client_id)
    logger.info(client_secret)

    grant_type = 'client_credentials'

    data = {
        'grant_type': grant_type,
        'client_id': client_id,
        'client_secret': client_secret,
        'code': code,
        'redirect_uri': redirect_uri
    }

    response = requests.post(token_url, data=data)
    if not response:
        return None

    return response.json().get('access_token')

def get_user_data(access_token):
    headers = {'Authorization': f'Bearer {access_token}'}
    response = requests.get('https://api.intra.42.fr/v2/me', headers=headers)
    
    if response.status_code == 200:
        return response.json()
    else:
        return None
