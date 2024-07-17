from matchmaking import Tournament, TournamentType, Player, rank, MAX_PLAYERS, MIN_GROUP_SIZE, MAX_GROUP_SIZE
from helper_func import closest_lower_power_of_2, closest_higher_power_of_2

def test_groups():
	print_settings()
	for i in range(1, MAX_PLAYERS):
		print("\n****************")
		tournament = Tournament(TournamentType.GROUPS)
		tournament.addPlayers(create_n_players(i))
		print(f"Playing with {i} players")
		tournament.play()

def test_roundrobin():
	for i in range(1, MAX_PLAYERS):
		print("\n****************")
		tournament = Tournament(TournamentType.ROUNDROBIN)
		tournament.addPlayers(create_n_players(i))
		print(f"Playing with {i} players")
		tournament.play()

def test_brackets():
	for i in range(1, MAX_PLAYERS):
		print("\n****************")
		tournament = Tournament(TournamentType.BRACKETS)
		tournament.addPlayers(create_n_players(i))
		print(f"Playing with {i} players")
		tournament.play()

def test_group_ko():
	for i in range(1, MAX_PLAYERS):
		print("\n****************")
		tournament = Tournament(TournamentType.GROUPS_KO)
		tournament.addPlayers(create_n_players(i))
		print(f"Playing with {i} players")
		tournament.play()

def test_closest_powers_of_2():
	print("Closest powers of two:")
	for i in range(0, MAX_PLAYERS):
		lower = closest_lower_power_of_2(i)
		higher = closest_higher_power_of_2(i)
		print(f"{i}: {lower} - {higher}")

def show_leaderboard(group):
	sep = "\t\t"
	print("Player" + sep + "Played\tPoints\tGS\tGT\tDiff\t")
	for player in group:
		print(f"{player}{sep}{player.games_played}\t{player.points}\t{player.goals_scored}\t{player.goals_taken}\t{player.goals_scored - player.goals_taken}")

def test_ranking():
	players = create_n_players(3)
	players[0].points = 9
	players[0].goals_scored = 10
	players[0].goals_taken = 5
	players[1].points = 9
	players[1].goals_scored = 11
	players[1].goals_taken = 6
	players[2].points = 6
	players[2].goals_scored = 10
	players[2].goals_taken = 5
	show_leaderboard(rank(players))

def print_settings():
	# print(f"Number of players: {PLAYERS}")
	print(f"Max players: {MAX_PLAYERS}")
	print(f"Group size: {MIN_GROUP_SIZE} to {MAX_GROUP_SIZE}")

def create_n_players(n):
	players = []
	for i in range(n):
		players.append(Player(f"player{i}"))
	return players

def main():
	test_groups()
	test_roundrobin()
	test_brackets()
	test_group_ko()
	test_closest_powers_of_2()
	test_ranking()
	exit()
	tournament = Tournament(TournamentType.GROUPS)
	tournament.addPlayers(create_n_players(PLAYERS))
	if len(tournament.players) > MAX_PLAYERS:
		print("Too many players!")
	tournament.play()
	if (tournament.players):
		print("The winner is: " + str(tournament.players[0]))

if __name__ == "__main__":
	main()