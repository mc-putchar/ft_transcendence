from django.contrib.auth import get_user_model
from rest_framework_simplejwt.authentication import JWTAuthentication

import logging

logger = logging.getLogger(__name__)

def get_user_from_token(request):
    user = None
    if request.headers.get('Authorization'):
        auth = JWTAuthentication()
        try:
            token = request.headers.get('Authorization').split(' ')[1]
            validated_token = auth.get_validated_token(token)
            user = auth.get_user(validated_token)
        except Exception as e:
            logger.error(f"Token error: {e}")
    return {'user': user}

def get_user_from_validated_token(token):
    user = None
    auth = JWTAuthentication()
    try:
        validated_token = auth.get_validated_token(token)
        user = auth.get_user(validated_token)
    except Exception as e:
        logger.error(f"Token error: {e}")
    return user
