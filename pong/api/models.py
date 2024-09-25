from django.db import models, transaction
from django.contrib.auth.models import User
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from PIL import Image

import logging
import random

logger = logging.getLogger(__name__)

def image_upload(instance, filename):
	ext = filename.split('.')[-1]
	if instance.user.username == 'default':
		return f'profile_images/{instance.user.username}#{instance.user.id}.{ext}'
	return f'profile_images/{instance.user.username}.{ext}'

class Profile(models.Model):
	user = models.OneToOneField(User, related_name='profile', on_delete=models.CASCADE)
	alias = models.CharField(max_length=24, blank=True)
	isOnline = models.BooleanField(default=False)
	client_3d = models.BooleanField(default=False)
	paddle = models.PositiveIntegerField(default=0)
	image = models.ImageField(upload_to=image_upload, default='profile_images/default.png')
	friends = models.ManyToManyField('self', through='Friend', symmetrical=False, related_name='friend_profiles', default=None, blank=True)
	blocked_users = models.ManyToManyField('self', through='Blocked', symmetrical=False, related_name='blocked_profiles', default=None, blank=True)
	forty_two_id = models.CharField(max_length=50, unique=True, null=True, blank=True)
	blockchain_address = models.CharField(max_length=42, null=True, blank=True, default=None)
	currently_playing = models.BooleanField(default=False)

	def save(self, *args, **kwargs):
		if not self.alias:
			self.alias = self.user.username
		super().save(*args, **kwargs)
		# if self.image and self.image.name != 'profile_images/default.png':
		#     self.resize_image()

	def has_blockchain(self):
		return self.blockchain_address is not None and self.blockchain_address != "0x0000000000000000000000000000000000000000"

	def resize_image(self):
		img = Image.open(self.image.path)
		if img.height > 420 or img.width > 420:
			output_size = (420, 420)
			img.thumbnail(output_size)
			img.save(self.image.path)

	def __str__(self):
		return f'{self.user.username} Profile'

	def set_online_status(self, status):
		"""Set the online status of the user"""
		self.isOnline = status
		self.save()

	def matches_won(self):
		"""Returns the number of matches won by the user."""
		return self.matches.filter(winner=True).count()

	def add_friend(self, friend_user):
		"""Adds a friend to the current user's profile."""
		if not Friend.objects.filter(from_user=self.user, to_user=friend_user).exists():
			Friend.objects.create(from_user=self.user, to_user=friend_user)

	def remove_friend(self, friend_user):
		"""Removes a friend from the current user's profile."""
		try:
			Friend.objects.get(from_user=self.user, to_user=friend_user).delete()
		except Friend.DoesNotExist:
			logger.error(f"Friend does not exist: {self.user.username} -> {friend_user.username}")

	def block_user(self, blocked_user):
		"""Blocks a user from the current user's profile."""
		if not Blocked.objects.filter(blocker=self.user, blocked=blocked_user).exists():
			Blocked.objects.create(blocker=self.user, blocked=blocked_user)

	def unblock_user(self, blocked_user):
		"""Unblocks a user from the current user's profile."""
		try:
			Blocked.objects.filter(blocker=self.user, blocked=blocked_user).delete()
		except Blocked.DoesNotExist:
			logger.error(f"Blocked user does not exist: {self.user.username} -> {blocked_user.username}")

	def get_friends(self):
		"""Returns a QuerySet of users who are friends with the current user."""
		friend_ids = Friend.objects.filter(from_user=self.user).values_list('to_user', flat=True)
		return User.objects.filter(id__in=friend_ids)

	def is_friend(self, user):
		"""Returns True if the user is a friend of the current user, False otherwise."""
		return Friend.objects.filter(from_user=self.user, to_user=user).exists()

	def get_blocked_users(self):
		"""Returns a QuerySet of users who are blocked by the current user."""
		blocked_ids = Blocked.objects.filter(blocker=self.user).values_list('blocked', flat=True)
		return User.objects.filter(id__in=blocked_ids)

	def is_blocked(self, user):
		"""Returns True if the user is blocked by the current user, False otherwise."""
		return Blocked.objects.filter(blocker=self.user, blocked=user).exists()


class Friend(models.Model):
	from_user = models.ForeignKey(User, related_name='friend_from', on_delete=models.CASCADE)
	to_user = models.ForeignKey(User, related_name='friend_to', on_delete=models.CASCADE)

	class Meta:
		unique_together = ('from_user', 'to_user')

	def __str__(self):
		return f'{self.from_user.username} -> {self.to_user.username}'

class Blocked(models.Model):
	blocker = models.ForeignKey(User, related_name='block_from', on_delete=models.CASCADE)
	blocked = models.ForeignKey(User, related_name='block_to', on_delete=models.CASCADE)

	class Meta:
		unique_together = ('blocker', 'blocked')

	def __str__(self):
		return f'{self.blocker.username} blocked {self.blocked.username}'   


class Tournament(models.Model):
	name = models.CharField(max_length=255, default="super-pong-tournament")
	creator = models.ForeignKey(Profile, on_delete=models.SET_NULL, related_name='tournaments_created', null=True)
	start_date = models.DateTimeField(default=timezone.now)
	end_date = models.DateTimeField(null=True, blank=True)
	status = models.CharField(max_length=50, default='open')
	on_blockchain = models.BooleanField(default=False)
	player_limit = models.IntegerField(default=16)
	prize = models.IntegerField(default=0)
	entry_fee = models.IntegerField(default=0)
	winner = models.ForeignKey(Profile, null=True, blank=True, on_delete=models.SET_NULL, related_name='tournaments_won')
	final_result = models.TextField(blank=True)
	round = models.IntegerField(default=0)

	def __str__(self):
		return self.name

	def is_full(self):
		"""Returns True if the tournament is full, False otherwise."""
		return self.participants.count() >= self.player_limit

	def is_open(self):
		"""Returns True if the tournament is open, False otherwise."""
		return self.status == 'open'

	def is_started(self):
		"""Returns True if the tournament is started, False otherwise."""
		return self.status == 'started'

	def is_over(self):
		"""Returns True if the tournament is closed, False otherwise."""
		return self.status == 'closed'

	def player_count(self):
		"""Returns the number of players participating in the tournament."""
		return self.participants.count()

	def get_players(self):
		"""Returns a QuerySet of players who are participating in the tournament."""
		return self.participants.all()

	def add_player(self, player):
		"""Adds a player to the tournament."""
		if self.is_open():
			TournamentPlayer.objects.create(tournament=self, player=player)

	def remove_player(self, player):
		"""Removes a player from the tournament."""
		if self.is_open():
			TournamentPlayer.objects.get(tournament=self, player=player).delete()

	def is_player(self, user):
		"""Returns True if the user is participating in the tournament, False otherwise."""
		return self.participants.filter(player__user=user).exists()

	def get_matches(self):
		"""Returns a QuerySet of matches in the tournament."""
		return self.matches.all()

	def add_match(self, match):
		"""Adds a match to the tournament."""
		match.tournament = self
		match.save()

	def start(self):
		"""Starts the tournament and does the initial matchmaking."""
		try:
			if not self.is_open():
				raise ValueError("Tournament is not open")
			with transaction.atomic():
				players = list(self.get_players())
				random.shuffle(players)
				if len(players) < 2:
					raise ValueError("Not enough players to start the tournament")
				self.round = 1
				for i in range(0, len(players), 2):
					if i + 1 < len(players):
						match = Match.objects.create(tournament=self, tournament_round=self.round)
						try:
							profile = Profile.objects.get(user=players[i].player.user)
							PlayerMatch.objects.create(match=match, player=profile)
							profile = Profile.objects.get(user=players[i + 1].player.user)
							PlayerMatch.objects.create(match=match, player=profile)
						except Profile.DoesNotExist:
							logger.error(f"Profile does not exist")
							PlayerMatch.objects.create(match=match, player=None)
				if len(players) & 1:
					match = Match.objects.create(tournament=self, tournament_round=self.round)
					try:
						profile = Profile.objects.get(user=players[-1].player.user)
						PlayerMatch.objects.create(match=match, player=profile, winner=True)
					except Profile.DoesNotExist:
						logger.error(f"Profile does not exist")
						Match.objects.delete(match)
				channel_layer = get_channel_layer()
				async_to_sync(channel_layer.group_send)(
					f'tournament_{self.id}',
					{
						'type': 'tournament_message',
						'message': 'start tournament'
					}
				)
				self.notify_players()
				self.status = 'started'
				for player in players:
					player.place = len(players) // 2 + 1
					player.save()
				self.save()
		except ValueError as e:
			logger.error(f"Failed to start tournament: {e}")

	def notify_players(self):
		"""Notifies players in the tournament that the tournament has started."""
		channel_layer = get_channel_layer()
		async_to_sync(channel_layer.group_send)(
			f'tournament_{self.id}',
			{
				'type': 'tournament_message',
				'message': f'round {self.round}'
			}
		)
		matches = self.get_matches().filter(tournament_round=self.round).all()
		for match in matches:
			players = match.get_players().filter(player__isnull=False).all()
			logger.info(f"Tournament match {match} scheduled: {players}")
			try:
				player1 = players[0].player.user
				player2 = players[1].player.user
			except IndexError:
				if players[0]:
					player1 = players[0].player.user
					player1.winner = True
					player1.save()
				message = f"match {match.id} {player1} bye"
			else:
				message = f"match {match.id} {player1} vs {player2}"
			async_to_sync(channel_layer.group_send)(
				f'tournament_{self.id}',
				{
					'type': 'tournament_message',
					'message': message
				}
			)

	def validate_round(self):
		"""Validates the current round of the tournament."""
		matches = self.get_matches()
		for match in matches:
			if not match.get_winner():
				return False
		return True

	def update_round(self, matches, winners):
		"""Updates the results of the tournament round."""
		self.round += 1
		current_place = len(winners) // 2 + 1
		for winner in winners:
			try:
				player = TournamentPlayer.objects.get(tournament=self, player=winner)
				player.place = current_place
				player.save()
			except TournamentPlayer.DoesNotExist:
				logger.error(f"Player does not exist")
				continue

	def next_round(self):
		"""Starts the next round of the tournament."""
		try:
			if not self.is_started():
				raise ValueError("Tournament is not started")
			if not self.validate_round():
				raise ValueError("Current round is not complete")
			with transaction.atomic():
				matches = self.get_matches().filter(tournament_round=self.round).all()
				players = []
				for match in matches:
					try:
						players.append(match.get_winner().profile)
					except AttributeError:
						continue
				self.update_round(matches, players)
				if len(players) < 2:
					self.end_tournament(players[0])
					return True

				random.shuffle(players)
				for i in range(0, len(players), 2):
					if i + 1 < len(players):
						match = Match.objects.create(tournament=self, tournament_round=self.round)
						try:
							profile = Profile.objects.get(user=players[i].user)
							PlayerMatch.objects.create(match=match, player=profile)
							profile = Profile.objects.get(user=players[i + 1].user)
							PlayerMatch.objects.create(match=match, player=profile)
						except Profile.DoesNotExist:
							logger.error(f"Profile does not exist")
							continue
				self.notify_players()
		except ValueError as e:
			logger.error(f"Failed to start next round: {e}")
			return False

	def end_tournament(self, winner):
		"""Ends the tournament and determines the winner."""
		try:
			if not self.is_started():
				raise ValueError("Tournament is not started")
			with transaction.atomic():
				if winner:
					player = TournamentPlayer.objects.get(tournament=self, player=winner)
					player.place = 1
					player.save()
				self.winner = winner
				self.status = 'closed'
				self.end_date = timezone.now()
				self.save()
			# TODO Commit to blockchain
		except ValueError as e:
			logger.error(f"Failed to end tournament: {e}")
		except TournamentPlayer.DoesNotExist:
			logger.error(f"Player does not exist")


class Match(models.Model):
	tournament = models.ForeignKey(Tournament, null=True, blank=True, on_delete=models.CASCADE, related_name='matches')
	tournament_round = models.IntegerField(default=1)
	date = models.DateTimeField(auto_now_add=True)

	def __str__(self):
		return f"Match on {self.date}"

	def get_players(self):
		"""Returns a QuerySet of players in the match."""
		return self.players.all()

	def is_player(self, user):
		"""Returns True if the user is participating in the match, False otherwise."""
		return self.players.filter(player__user=user).exists()

	def get_winner(self):
		"""Returns the winner of the match."""
		try:
			winner =  self.players.get(winner=True).player
		except PlayerMatch.DoesNotExist:
			return None
		return winner.user

	def get_scores(self):
		"""Returns a dictionary of players and their scores in the match."""
		scores = {}
		for player in self.players.all():
			scores[player.player.alias] = player.score
		return scores

class PlayerMatch(models.Model):
	match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name='players')
	player = models.ForeignKey(Profile, on_delete=models.SET_NULL, related_name='matches', null=True)
	score = models.IntegerField(default=0)
	winner = models.BooleanField(default=False)

	class Meta:
		unique_together = ('match', 'player')

	def __str__(self):
		return f"{self.player} in {self.match} scored {self.score} and {'won' if self.winner else 'lost'} "

	# def get_opponent(self):
	#     """Returns the opponent of the player in the match."""
	#     try:
	#         opponent = self.match.players.exclude(player=self.player).first()
	#     except PlayerMatch.DoesNotExist:
	#         return None
	#     if opponent:
	#         return opponent.player
	#     return None

	def get_opponent(self):
		"""Returns the PlayerMatch instance of the opponent in the match."""
		try:
			opponent_match = self.match.players.exclude(player=self.player).first()
			return opponent_match  # Return the PlayerMatch instance, not just the player (Profile)
		except PlayerMatch.DoesNotExist:
			return None

class TournamentPlayer(models.Model):
	tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name='participants')
	player = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='tournaments')
	place = models.IntegerField(default=0)

	class Meta:
		unique_together = ('tournament', 'player')

	def __str__(self):
		return f"{self.player} placed {self.place} in tournament: {self.tournament}"

