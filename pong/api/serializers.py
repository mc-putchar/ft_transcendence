from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile, Friend

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer()

    class Meta:
        model = Profile
        fields = ['user', 'alias', 'friendList', 'isOnline', 'image']
        depth = 1

class FriendSerializer(serializers.ModelSerializer):
    users = UserSerializer(many=True, read_only=True)

    class Meta:
        model = Friend
        fields = ['current_user', 'users']
