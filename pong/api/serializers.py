from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Profile, Friend, Blocked

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Profile
        fields = ['user', 'alias', 'isOnline', 'image']
        depth = 1

    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', None)
        if user_data:
            user_serializer = UserSerializer(instance=instance.user, data=user_data, partial=True)
            if user_serializer.is_valid():
                user_serializer.save()
        return super().update(instance, validated_data)

class FriendSerializer(serializers.ModelSerializer):
    users = UserSerializer(many=True, read_only=True)
    current_user = UserSerializer(read_only=True)

    class Meta:
        model = Friend
        fields = ['current_user', 'users']

class BlockedSerializer(serializers.ModelSerializer):
    users = UserSerializer(many=True, read_only=True)
    annoyed_user = UserSerializer(read_only=True)

    class Meta:
        model = Blocked
        fields = ['annoyed_user', 'users']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    password_confirmation = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['username', 'password', 'password_confirmation', 'email']

    def validate(self, data):
        if data['password'] != data['password_confirmation']:
            raise serializers.ValidationError("Passwords do not match.")
        return data

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            email=validated_data['email']
        )
        return user
