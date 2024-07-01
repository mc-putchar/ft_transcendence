from django.http import HttpResponse
import secrets
from django.shortcuts import render, redirect
from django.template import loader
from .models import User

def index(request):
    state = secrets.token_urlsafe(32)
    template = loader.get_template('index.html')
    return HttpResponse(template.render())

def redirect(request):
    print('-----------------helo redirect------------')


    template = loader.get_template('online_students.html')
    return HttpResponse(template.render())

def users(request):
    users = User.objects.all().values()
    template = loader.get_template('users.html')
    context = {
        'users': users,
    }
    return HttpResponse(template.render(context, request))

def profile(request, id):
    user = User.objects.get(id=id)
    template = loader.get_template('profile.html')
    context = {
        'user': users,
    }
    return HttpResponse(template.render(context, request))
