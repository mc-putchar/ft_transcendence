# make login forms here for django login
from api.models import Profile
from django import forms
from django.contrib.auth.models import User
import logging
from blockchain.blockchain_api import PongBlockchain, hash_player
from web3.exceptions import InvalidAddress
import os

logger = logging.getLogger(__name__)

class LoginForm(forms.Form):
    username = forms.CharField(label='Username', max_length=16, widget=forms.TextInput(attrs={'class': 'form-control'}), required=True)
    password = forms.CharField(label='Password', max_length=100, widget=forms.PasswordInput(attrs={'class': 'form-control'}), required=True)
    
    class Meta:
        model = User
        fields = ['username', 'password']

    def clean(self):
        cleaned_data = super().clean()
        username = cleaned_data.get("username")
        password = cleaned_data.get("password")

        if not User.objects.filter(username=username).exists():
            raise forms.ValidationError(
                "Username does not exist")

        user = User.objects.get(username=username)
        if not user.check_password(password):
            raise forms.ValidationError(
                "Password is incorrect")

        return cleaned_data
    
    def is_valid(self):
        return super().is_valid()

class RegisterForm(forms.ModelForm):
    password = forms.CharField(widget=forms.PasswordInput)
    confirm_password = forms.CharField(widget=forms.PasswordInput)
    email = forms.EmailField()


    class Meta:
        model = User
        fields = ['username', 'email', 'password']

    def clean(self):
        cleaned_data = super().clean()
        username = cleaned_data.get("username")
        if len(username) > 16:
            raise forms.ValidationError(
                "Username is too long")
        password = cleaned_data.get("password")
        confirm_password = cleaned_data.get("confirm_password")

        if password != confirm_password:
            raise forms.ValidationError(
                "Password and Confirm Password do not match")

        return cleaned_data
    
class UserUpdateForm(forms.ModelForm):
    email = forms.EmailField()

    class Meta:
        model = User
        fields = ['email']
        widgets = {
                'email': forms.EmailInput(attrs={'class': 'form-control',}),
        }

class ProfileUpdateForm(forms.ModelForm):
    class Meta:
        model = Profile
        fields = ['alias', 'image', 'client_3d', 'blockchain_address']
        widgets = {
            'alias': forms.TextInput(attrs={'class': 'form-control'}),
            'image': forms.FileInput(attrs={'class': 'form-control'}),
            'client_3d': forms.CheckboxInput(attrs={'class': 'form-check-input'}),
            'blockchain_address': forms.TextInput(attrs={
                'class': 'form-control',
                'pattern': '^(0x[a-fA-F0-9]{40}|[a-zA-Z0-9]{40})$', # 40 hexadecimal characters preceded by 0x or not
                'title': 'Enter a valid Ethereum address: 0x followed by 40 hexadecimal characters',
                }),
        }
    
    def __init__(self, *args, **kwargs):
            super(ProfileUpdateForm, self).__init__(*args, **kwargs)
            user = kwargs.get('instance').user
            if not user.profile.blockchain_address:
                self.fields.pop('blockchain_address')

    def save(self, commit=True):
        """Override save method to update blockchain address on chain"""
        profile = super(ProfileUpdateForm, self).save(commit=False)
        if 'blockchain_address' in self.changed_data:
            new_address = self.cleaned_data['blockchain_address']
            chain = PongBlockchain()
            player_hash = hash_player([profile.user.email, profile.user.id])
            chain.updatePlayerAddress(chain.accounts[0], os.getenv('HARDHAT_PRIVATE_KEY'), player_hash, new_address)
            logger.info(f"Updated on chain address: {chain.getPlayer(player_hash)[5]}")
        if commit:
            profile.save()
        return profile

    def clean(self):
        """Override clean method to validate image size and blockchain address"""
        cleaned_data = super().clean()
        image = cleaned_data.get("image")
        if image and image.size > 2*1024*1024:
            raise forms.ValidationError(
                "Image file is too large ( > 2mb )")
        blockchain_address = cleaned_data.get("blockchain_address")
        if blockchain_address:
            blockchain_address = PongBlockchain().web3.to_checksum_address(blockchain_address)
            cleaned_data['blockchain_address'] = blockchain_address
            if not PongBlockchain().web3.is_checksum_address(blockchain_address): # Custom validate blockchain address
                raise forms.ValidationError(
                    "Invalid blockchain address")
        return cleaned_data

class UsernameCollisionForm(forms.Form):
    username = forms.CharField(label='Username', max_length=16, widget=forms.TextInput(attrs={'class': 'form-control'}), required=True)

    class Meta:
        model = User
        fields = ['username']

    def clean(self):
        cleaned_data = super().clean()
        username = cleaned_data.get("username")
        if User.objects.filter(username=username).exists():
            raise forms.ValidationError(
                "Username already exists")
        return cleaned_data

    def is_valid(self):
        return super().is_valid()

class ChangePasswordForm(forms.Form):
    old_password = forms.CharField(label='Old Password', max_length=100, widget=forms.PasswordInput(attrs={'class': 'form-control'}), required=True)
    new_password = forms.CharField(label='New Password', max_length=100, widget=forms.PasswordInput(attrs={'class': 'form-control'}), required=True)
    confirm_password = forms.CharField(label='Confirm Password', max_length=100, widget=forms.PasswordInput(attrs={'class': 'form-control'}), required=True)

    class Meta:
        model = User
        fields = ['old_password', 'new_password', 'confirm_password']

    def clean(self):
        cleaned_data = super().clean()
        new_password = cleaned_data.get("new_password")
        confirm_password = cleaned_data.get("confirm_password")

        if new_password != confirm_password:
            raise forms.ValidationError(
                "New Password and Confirm Password do not match")

        return cleaned_data

    def is_valid(self):
        return super().is_valid()

