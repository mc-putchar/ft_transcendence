from django.http import HttpResponse
import secrets
from django.shortcuts import render, redirect
from django.template import loader

def index(request):
    state = secrets.token_urlsafe(32)
    template = loader.get_template('index.html')
    return HttpResponse(template.render())

def redirect(request):
    print('-----------------helo redirect------------')


    template = loader.get_template('online_students.html')
    return HttpResponse(template.render())
