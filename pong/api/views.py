from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth.models import User
from .models import Profile, Friend
from .serializers import ProfileSerializer, UserSerializer, FriendSerializer

class ProfileDetail(generics.RetrieveUpdateAPIView):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer

    def get_object(self):
        return self.request.user.profile

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
        friend_instance, created = Friend.objects.get_or_create(current_user=user)
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

