from django.http import JsonResponse
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

from rest_framework import viewsets, generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema

from .models import Profile, Friend, Blocked
from .serializers import UserSerializer, ProfileSerializer, FriendSerializer, BlockedSerializer, RegisterSerializer

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@extend_schema(
    summary="Logout the user and blacklist the refresh token.",
    parameters=[
        {
            "name": "refresh",
            "required": True,
            "in": "body",
            "schema": {"type": "string"},
            "description": "The refresh token to blacklist and log out the user."
        }
    ],
    responses={204: None, 400: None}
)
def logout(self, request):
    """Logout the user and blacklist the refresh token."""
    try:
        refresh_token = request.data["refresh"]
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response(status=status.HTTP_205_RESET_CONTENT)
    except Exception as e:
        return Response(status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@extend_schema(
    summary="Change the user's password.",
    parameters=[
        {
            "name": "old_password",
            "required": True,
            "in": "body",
            "schema": {"type": "string"},
            "description": "The user's current password."
        },
        {
            "name": "new_password",
            "required": True,
            "in": "body",
            "schema": {"type": "string"},
            "description": "The user's new password."
        }
    ],
    responses={200: None, 400: None}
)
def change_password(self, request):
    """Change the user's password."""
    user = request.user
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')

    if not user.check_password(old_password):
        return Response({"old_password": "Wrong password."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        validate_password(new_password, user=user)
    except ValidationError as e:
        return Response({"new_password": e.messages}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save()
    return Response({"detail": "Password updated successfully."}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@extend_schema(
    summary="Anonymize the user's data.",
    responses={200: None}
)
def anonymize_user(self, request):
    """Anonymize the user's data."""
    user = request.user
    hashed_value = str(hash({user.username, user.id}))
    user.username = f"marvin_{hashed_value}"
    user.email = ""
    user.profile.alias = f"marvin"
    user.profile.image = 'profile_images/default.png'
    user.profile.friends.clear()
    user.profile.blocked_users.clear()
    user.profile.forty_two_id = ''
    user.profile.blockchain_address = ''
    user.save()
    return JsonResponse({"message": "Your data has been anonymized."}, status=200)

class DeleteAccountView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    @extend_schema(
        summary="Delete the user's account.",
        responses={204: None}
    )
    def delete(self, request, *args, **kwargs):
        """Delete the user's account."""
        user = request.user
        user.delete()
        return Response({"detail": "Account deleted successfully."}, status=status.HTTP_204_NO_CONTENT)

class RegisterView(generics.CreateAPIView):
    """Register a new user."""
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

class OnlineUsersView(generics.ListAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return a list of online users."""
        return Profile.objects.filter(isOnline=True)

class ProfileViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ProfileSerializer

    @action(detail=False, methods=['post'])
    def add_friend(self, request):
        """Add a friend to the current user's profile."""
        to_user_id = request.data.get('user_id')
        try:
            to_user = User.objects.get(id=to_user_id)
            request.user.profile.add_friend(to_user)
            return Response({'status': 'friend added'}, status=status.HTTP_201_CREATED)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'])
    def remove_friend(self, request):
        """Remove a friend from the current user's profile."""
        to_user_id = request.data.get('user_id')
        try:
            to_user = User.objects.get(id=to_user_id)
            request.user.profile.remove_friend(to_user)
            return Response({'status': 'friend removed'}, status=status.HTTP_204_NO_CONTENT)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def block_user(self, request):
        """Block a user from the current user's profile."""
        blocked_user_id = request.data.get('user_id')
        try:
            blocked_user = User.objects.get(id=blocked_user_id)
            request.user.profile.block_user(blocked_user)
            return Response({'status': 'user blocked'}, status=status.HTTP_201_CREATED)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'])
    def unblock_user(self, request):
        """Unblock a user from the current user's profile."""
        blocked_user_id = request.data.get('user_id')
        try:
            blocked_user = User.objects.get(id=blocked_user_id)
            request.user.profile.unblock_user(blocked_user)
            return Response({'status': 'user unblocked'}, status=status.HTTP_204_NO_CONTENT)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def friends(self, request):
        """Get a list of friends for the current user."""
        friends = request.user.profile.get_friends()
        serializer = UserSerializer(friends, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def blocked_users(self, request):
        """Get a list of blocked users for the current user."""
        blocked_users = request.user.profile.get_blocked_users()
        serializer = UserSerializer(blocked_users, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='user/(?P<username>[^/.]+)')
    def retrieve_by_username(self, request, username=None):
        """Retrieve a user's profile by username."""
        try:
            user = User.objects.get(username=username)
            profile = Profile.objects.get(user=user)
            serializer = ProfileSerializer(profile)
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Profile.DoesNotExist:
            return Response({'detail': 'Profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get the current user's profile."""
        serializer = ProfileSerializer(request.user.profile)
        return Response(serializer.data)

