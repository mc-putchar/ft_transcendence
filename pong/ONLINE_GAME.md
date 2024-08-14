
# Online game flow:

## Client side
### Challenge a user:
- chat command `/duel <target_username>`
	or link on user profile to `#/duel/<target_user_id>`
	starts a websocket `/ws/game/<username>/`
- target user receives modal (check if already in a game) to accept or decline challenge
	and connects to the same websocket with reply (accept/decline)
- if accepted, target user creates a new match `/game/matches/create_match/`
	and sends the match id on the websocket to the challenger
- both players join the match via `/game/matches/<match_id>/join/`
- both players send registration on the websocket to verify participation:
	```json
	{ "type": "register", "player": "player"<1|2>, "user": <username>, "match_id": <match_id> }
	```
- when both registered players send ready signal, the game starts:
	```json
	{ "type": "ready", "player": "player"<1|2> }
	```
- if one player registers, 30 seconds to register the other player, otherwise forfeit
- if a player disconnects, forfeit (TODO: implement reconnection attempt)
- players send moves to the websocket:
	```json
	{ "type": "player"<1|2>"_position", "position": <position.x>, "direction": <direction> }
	```
- players and spectators receive automatic game state updates on the channel:
	```json
	{ "type": "game_state", "game_state": <GameData> }
	```
- server game state is continuously updated in redis memory cache
- game ends when game_state.status is "finished" or "forfeited"
- on game end, the match results are saved in the database

### Spectate a game:
	- not implemented yet

### Tournament:
- player creates a tournament via `/game/tournaments/create_tournament_form/`
- other players can join via `/game/tournaments/<tournament_id>/join/`
- they can leave via `/game/tournaments/<tournament_id>/leave/`
- joined players connect to the tournament websocket `/ws/tournament/<tournament_id>/`
- when at least 2 players are joined, the creator may start the tournament
- on start, the tournament creates initial round matches, announces start and sends match ids with pairings as `<match_id> <player1_username> vs <player2_username>` or `<match_id> <player1_username> bye` if no opponent for the player in the round
- players join the matches via `/game/matches/<match_id>/join/`
  and websocket `/ws/game/<tournament_id>#<match_id>#<player1_username>/`
- when all the games of the round are concluded, the tournament progresses to the next round
- when all the rounds are concluded, the tournament finalizes and announces a winner
