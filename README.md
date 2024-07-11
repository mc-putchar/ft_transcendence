## Ft_Transcendence

### Basics:
  - Everything must be launched with a single command line to run an autonomous
    container provided by Docker . Example : docker-compose up --build

  * III.3 Game
    - *`tournament`*. This tournament will consist of multiple players who
      can take turns playing against each other. You have flexibility in how you implement
      the tournament, but it must clearly display who is playing against whom and the
      order of the players.

    - *`registration system`* is required: at the start of a tournament, each player
      must input their alias name. The aliases will be reset when a new tournament
      begin

    - *`matchmaking`* system: the tournament system organize the
      matchmaking o**f the participants, and announce the next fight.

  * III.4 Security
    - Any password stored in your database, if applicable, must be **_hashed_**.

    - Your website must be protected against **_SQL injections/XSS._**

    - ***HTTPS***

  - [x] The project must be written in Django.
  - [x] The project must use PostgreSQL as a database.
  - [x] The project must use Bootstrap for the frontend.
  - [x] The project must use advanced 3D techniques.
  - [x] The project must support multiple players.
  - [x] The project must use remote authentication (42 OAuth).
  - [x] The project must support additional browser support.
  - [x] The project must support all devices.
  - [x] The project must use vanilla JavaScript for the frontend.

### _Points:_
```
1   - Django			                1
0.5 - Bootstrap
0.5 - Postgres	                        1
1   - Advance 3d Techniques             1
1   - Multiple players                  1
1   - remote authentication 42 Oauth    1
0.5 - Additional browser suppor
0.5 - Support of all devices		    1
1   - Standart User managment		    1
1   - Blockchain                        1
```
      required 7 , current total  = 8
```
Extra:

1   - Remote Player Management		1
1   - AI Opponent                   1
1   - Additional Game               1
1   - Live Chat				        1
1   - Designing the Backend as		1
	  Microservices.

1  - Server-Side Pong Game		1
```
<br>

### Live Chat.

You have to create a chat for your users in this module:

◦ The user should be able to send direct messages to other users.

◦ The user should be able to block other users. This way, they will see no more
  messages from the account they blocked.

◦ The user should be able to invite other users to play a Pong game through the
  chat interface.

◦ The tournament system should be able to warn users expected for the next
  game.

◦ The user should be able to access other players profiles through the chat in-
terface.

