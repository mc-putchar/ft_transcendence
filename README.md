## _Ft_Transcendence_


## _TODO_ :  

### _Carlo_:

  - [ ] make mention modals behave like notifications over websockets
  - [ ] Structure a database model for storing chat messages :
	* main chat 
	* direct messages between users
	* ability to block users 
	* add them as friends

### _Martin_:

  - [ ] Tournament system continued
  - [ ] Improve predictive client side rendering
  - [ ] Configure server WAF
  - [ ] Resolve 42auth username conflict
  - [ ] Timely JWT token refresh
  - [ ] General matchmaking (not only direct challenges)
  - [ ] TranscendCLI
  - [ ] Maybe setup email verification (for password reset and maybe optional 2FA)


## _Basics_:

  - Everything must be launched with a single command line to run an autonomous
    container provided by Docker . Example : docker-compose up --build  
	```bash
	$ make 
	```

  * _III.3 Game_
    - *`tournament`*. This tournament will consist of multiple players who
      can take turns playing against each other. You have flexibility in how you implement
      the tournament, but it must clearly display who is playing against whom and the
      order of the players.

    - *`matchmaking`* system: the tournament system organize the
      matchmaking of the participants, and announce the next fight.

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
1   - Django                            1
0.5 - Bootstrap
0.5 - Postgres                          1
1   - Advanced 3D Techniques            1
1   - Multiple players                  1
1   - remote authentication 42 Oauth    1
0.5 - Additional browser support
0.5 - Support of all devices            1
1   - Standard User managment           1
1   - Blockchain                        1
1   - Remote Players                    1
1   - Live Chat                         1
0.5 - Server-Side Rendering
0.5 - GDPR compliance                   1
1   - Server-Side Pong Game with API    1
1   - AI Opponent                       1
```

      required 7 ,     current total  = 13

```
1   - Additional Game				1
1   - CLI Pong						1
1   - JWT and 2FA					1
```
<br>

### _Live Chat_.

You have to create a chat for your users in this module:

◦ The user should be able to send direct messages to other users. [X]

◦ The user should be able to _block_ other users. This way, they will _see_ no more
  messages from the account they blocked.

◦ The user should be able to _invite_ other users to play a Pong game through the
  chat interface.

◦ The tournament system should be able to warn users expected for the next
  game.
    - *_IN THE CHAT??_*

◦ The user should be able to access other players profiles through the chat in-
terface.

