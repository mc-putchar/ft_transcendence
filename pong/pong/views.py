from django.http import HttpResponse


def index(request):
	HttpResponse("Hello, world. You're at the ponog index.")
