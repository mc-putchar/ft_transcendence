from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import User
from .models import Profile, Friend, Blocked
from .serializers import ProfileSerializer, UserSerializer, FriendSerializer


class ProfileDetailView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    lookup_field = 'user__username'

    def get_queryset(self):
        return Profile.objects.filter(user__is_active=True)


class OnlineListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer

    def get_queryset(self):
        return Profile.objects.filter(isOnline=True)


class ProfileListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer


class UserListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    queryset = User.objects.all()
    serializer_class = UserSerializer


class FriendListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_queryset(self):
        user = self.request.user
        friend_instance, created = Friend.objects.get_or_create(
            current_user=user)
        return friend_instance.users.all()


class AddFriendView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        friend_id = request.data.get('friend_id')
        try:
            new_friend = User.objects.get(id=friend_id)
            Friend.make_friend(user, new_friend)
            return Response({'status': 'friend added'}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'status': 'friend not found'}, status=status.HTTP_404_NOT_FOUND)


class RemoveFriendView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        friend_id = request.data.get('friend_id')
        try:
            old_friend = User.objects.get(id=friend_id)
            Friend.lose_friend(user, old_friend)
            return Response({'status': 'friend removed'}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'status': 'friend not found'}, status=status.HTTP_404_NOT_FOUND)


class BlockListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer

    def get_queryset(self):
        user = self.request.user
        blocked_instance, created = Blocked.objects.get_or_create(
            annoyed_user=user)
        return blocked_instance.users.all()


class AddBlockedView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        blocked_id = request.data.get('blocked_id')
        try:
            new_blocked = User.objects.get(id=blocked_id)
            Blocked.block_user(user, new_blocked)
            return Response({'status': 'user blocked'}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'status': 'user not found'}, status=status.HTTP_404_NOT_FOUND)


class RemoveBlockedView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        blocked_id = request.data.get('blocked_id')
        try:
            old_blocked = User.objects.get(id=blocked_id)
            Blocked.unblock_user(user, old_blocked)
            return Response({'status': 'user block removed'}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({'status': 'user not found'}, status=status.HTTP_404_NOT_FOUND)
