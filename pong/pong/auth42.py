import requests, logging
from django.conf import settings

logger = logging.getLogger('django')

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


