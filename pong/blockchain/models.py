from django.db import models


class Chain(models.Model):
	address = models.CharField(max_length=255)
