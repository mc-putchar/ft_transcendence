import random 
from itertools import combinations
from enum import Enum, auto
from helper_func import print_groups

"""
ROUNDROBIN: all vs all -> count points then goal diff then direct match. 
- What if there are more than 2 with same points and goal diff?
GROUPS + KNOCKOUT (GROUPS_KO): split in groups, group winners go to brackets round
- Prime numbers? Wildcards to the next round to the players up to the closest
multiple of 3, 4 or 5?
PURE GROUPS: same group splitting, then the points are counted tournament-wise and 
a group of the players with the same score is made over and over until there's 
only one winner
BRACKETS: works for participants number power of 2.
- If it's not a power of 2? Wildcards? 
"""

PLAYERS = 3 # > 0
MAX_PLAYERS = 12 # > 0
POINTS_FOR_WIN = 3 # > 0
MIN_GROUP_SIZE = 3 # >= 3
MAX_GROUP_SIZE = 5 # > MIN_GROUP_SIZE
PLAYERS_ADVANCING_PER_GROUP = 2 # > 0


class TournamentType(Enum):
	ROUNDROBIN = auto()
	GROUPS = auto()
	GROUPS_KO = auto()
	BRACKETS = auto()

class Player():
	def __init__(self, name):
		self.alias = name
		self.points = 0
		self.games_played = 0
		self.goals_scored = 0
		self.goals_taken = 0
	def __str__(self):
		return self.alias
	

class Match():
	def __init__(self, player1, player2, tournament):
		self.player1 = player1
		self.player2 = player2
		self.tournament = tournament

	def simulate(self):
		self.score1 = 0
		self.score2 = 0
		self.player1.games_played += 1
		# print(f"{self.player1} played {self.player1.games_played} games")
		self.player2.games_played += 1
		# print(f"{self.player2} played {self.player2.games_played} games")
		while self.score1 == self.score2:
			self.score1 = random.randint(0, 10)
			self.score2 = random.randint(0, 10)
		print(f"{self.player1} - {self.player2}: {self.score1} - {self.score2}")
		self.player1.goals_scored += self.score1
		self.player2.goals_taken += self.score1
		self.player2.goals_scored += self.score2
		self.player1.goals_taken += self.score2
		if self.score1 > self.score2:
			self.player1.points +=POINTS_FOR_WIN
		else:
			self.player2.points += POINTS_FOR_WIN

class Tournament():
	def __init__(self, type):
		self.matches = []
		self.players = []
		self.players_next_round = []
		self.leaderboard = []
		self.groups = [[]]
		self.type = type

	def __str__(self):
		return f"[{', '.join(str(player) for player in self.players)}]"
	
	def addPlayers(self, players):
		self.players = list(players)
		# random.shuffle(self.players)
		self.leaderboard = self.players

	def addMatch(self, match):
		self.matches.append(match)

	"""
	Assigns wildcards to the next round to some players in order to have the 
	right amount for the chosen tournament mechanism
	It returns a tuple with (group size, number of groups)
	"""
	def adjust_n_players(self):
		players = len(self.players)
		if self.type == TournamentType.ROUNDROBIN:
			return (players, 1)
		if self.type == TournamentType.GROUPS or self.type == TournamentType.GROUPS_KO:
			if players <= MIN_GROUP_SIZE:
				return (players, 1)
			# max_size = min(MAX_GROUP_SIZE, players // 2)
			max_size = MAX_GROUP_SIZE
			fewer_wildcards = (max_size, players)
			for group_size in range(max_size, MIN_GROUP_SIZE - 1, -1):
				wildcards = players % group_size
				if (wildcards == 0):
					return (group_size, players // group_size)
				if wildcards < fewer_wildcards[1]:
					fewer_wildcards = (group_size, wildcards)
			group_size = fewer_wildcards[0]
			self.give_wildcards(fewer_wildcards[1])
		elif self.type == TournamentType.BRACKETS:
			group_size = 2
			wildcards = players % 2
			self.give_wildcards(wildcards)
		return (group_size, len(self.players) // group_size)
	
	def make_groups(self, players, group_size):
		print(f"Making {len(players) // group_size} groups of {group_size}")
		self.groups = [players[i:i + group_size] for i in range(0, len(players), group_size)]
		return self.groups
	
	def give_wildcards(self, n):
		print(f"{n} players get wildcards to the next round")
		self.players_next_round = self.players[:n:]
		self.players = self.players[n::]

	def make_phase_calendar(self, groups):
		for group in groups:
			comb = list(combinations(group, 2))
			for match in comb:
				self.matches.append(Match(match[0], match[1], self))
		print(f"{len(self.matches)} games to play")

	def play_phase(self):
		for match in self.matches:
			match.simulate()

	def play(self):
		# adjust number of players
		# adjust group size
		# split into groups
		# simulate group
		# update next round players
		while (len(self.players) > 1):
			self.phase_reset()
			# random.shuffle(self.players)
			group_size, n_groups = self.adjust_n_players()
			groups = self.make_groups(self.players, group_size)
			print_groups(groups)
			self.make_phase_calendar(groups)
			self.play_phase()
			self.next_phase()
		print(f"The winner is: {self.players[0]}")

	def show_leaderboard(self, group):
		sep = "\t\t"
		print("Player" + sep + "Played\tPoints\tGS\tGT\tDiff\t")
		for player in group:
			print(f"{player}{sep}{player.games_played}\t{player.points}\t{player.goals_scored}\t{player.goals_taken}\t{player.goals_scored - player.goals_taken}")
	
	def next_phase(self):
		for group in self.groups:
			leaderboard = rank(group)
			self.show_leaderboard(leaderboard)
			if self.type in [TournamentType.GROUPS, TournamentType.GROUPS_KO]:
				self.players_next_round.extend(leaderboard[:PLAYERS_ADVANCING_PER_GROUP:])
			else: 
				self.players_next_round.append(leaderboard[0])
		if self.type == TournamentType.ROUNDROBIN:
			self.players = [self.players_next_round[0]]
		elif self.type == TournamentType.GROUPS:
			top_score = self.players_next_round[0].points
			self.players = [player for player in self.players_next_round if player.points == top_score]
		elif self.type == TournamentType.GROUPS_KO:
			self.type = TournamentType.BRACKETS
			self.players = self.players_next_round[:] # [:] for shallow copy
		elif self.type == TournamentType.BRACKETS:
			self.players = self.players_next_round[:] # [:] for shallow copy

	def phase_reset(self):
		for player in self.players:
			player.points = 0
		self.players_next_round.clear()
		self.matches.clear()

def rank(players):
	return sorted(players, key=lambda player: (player.points, (player.goals_scored - player.goals_taken), player.goals_scored), reverse=True)

# def main():
# 	tournament = Tournament(TournamentType.GROUPS)
# 	tournament.addPlayers(create_n_players(PLAYERS))
# 	if len(tournament.players) > MAX_PLAYERS:
# 		return print("Too many players!")
# 	# Round Robin
# 	tournament.play()
# 	if (tournament.players):
# 		print("The winner is: " + str(tournament.players[0]))

# if __name__ == "__main__":
# 	main()