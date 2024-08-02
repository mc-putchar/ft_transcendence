from django.contrib.auth import get_user_model
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.request import Request

def get_user_from_token(request):
    user = None
    if request.headers.get('Authorization'):
        auth = JWTAuthentication()
        try:
            # Extract the token from the header
            token = request.headers.get('Authorization').split(' ')[1]
            # Decode the token to get the user
            validated_token = auth.get_validated_token(token)
            user = auth.get_user(validated_token)
        except Exception as e:
            # Handle token errors
            print(f"Token error: {e}")
    return {'user': user}
