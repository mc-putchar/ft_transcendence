# make login forms here for django login
from api.models import Profile
from django import forms
from django.contrib.auth.models import User

class LoginForm(forms.Form):
    username = forms.CharField(label='Username', max_length=100, widget=forms.TextInput(attrs={'class': 'form-control'}), required=True)
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
        # TODO Add blockchain address field
        fields = ['alias', 'image', 'evm_addr']
        widgets = {
            'alias': forms.TextInput(attrs={'class': 'form-control'}),
           'image': forms.FileInput(attrs={'class': 'form-control'}),
              'evm_addr': forms.TextInput(attrs={'class': 'form-control'}),
        }

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

