from django.http import JsonResponse
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

from rest_framework import viewsets, generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Profile, Friend, Blocked
from .serializers import UserSerializer, ProfileSerializer, FriendSerializer, BlockedSerializer, RegisterSerializer

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response(status=status.HTTP_400_BAD_REQUEST)

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
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

class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, *args, **kwargs):
        user = request.user
        user.delete()
        return Response({"detail": "Account deleted successfully."}, status=status.HTTP_204_NO_CONTENT)

class AnonymizeUserView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        user.username = f"marvin#{user.id}"
        user.email = ""
        user.profile.image = 'profile_images/default.png'
        user.save()
        return JsonResponse({"message": "Your data has been anonymized."}, status=200)

class FriendViewSet(viewsets.ModelViewSet):
    queryset = Friend.objects.all()
    serializer_class = FriendSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Friend.objects.filter(current_user=self.request.user)

    @action(detail=True, methods=['post'])
    def add_friend(self, request, pk=None):
        user_to_add = User.objects.get(pk=pk)
        Friend.make_friend(request.user, user_to_add)
        return Response({"detail": "Friend added successfully."}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def remove_friend(self, request, pk=None):
        user_to_remove = User.objects.get(pk=pk)
        Friend.lose_friend(request.user, user_to_remove)
        return Response({"detail": "Friend removed successfully."}, status=status.HTTP_200_OK)

class BlockedViewSet(viewsets.ModelViewSet):
    queryset = Blocked.objects.all()
    serializer_class = BlockedSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Blocked.objects.filter(annoyed_user=self.request.user)

    @action(detail=True, methods=['post'])
    def block_user(self, request, pk=None):
        user_to_block = User.objects.get(pk=pk)
        Blocked.block_user(request.user, user_to_block)
        return Response({"detail": "User blocked successfully."}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def unblock_user(self, request, pk=None):
        user_to_unblock = User.objects.get(pk=pk)
        Blocked.unblock_user(request.user, user_to_unblock)
        return Response({"detail": "User unblocked successfully."}, status=status.HTTP_200_OK)

class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Profile.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='user/(?P<username>[^/.]+)')
    def retrieve_by_username(self, request, username=None):
        try:
            user = User.objects.get(username=username)
            profile = Profile.objects.get(user=user)
            serializer = ProfileSerializer(profile)
            return Response(serializer.data)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
        except Profile.DoesNotExist:
            return Response({'detail': 'Profile not found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        serializer = ProfileSerializer(request.user.profile)
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)

class ActiveUsersView(generics.ListAPIView):
    queryset = User.objects.filter(is_active=True)
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

class OnlineUsersView(generics.ListAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Profile.objects.filter(isOnline=True)

