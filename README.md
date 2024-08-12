# _ft_transcendence_

[badges]

> This project is about doing something you’ve never done before.
> Remind yourself the beginning of your journey in computer science.
> Look at you now. Time to shine!  
<p style='text-align: center;'> -- en.subject.pdf (v.15) </p>

[IMAGE_PLACEHOLDER]

# _Description_:
Free open-source web platform, mainly for playing Pong games and tournaments.  
Inspired by the classic Pong game of the 70s, infused with modern features and technologies.  

# _Setup_:
  - Everything is launched with a single command line to run
	```bash
	$ make 
	```
  - Follow the Setup Wizard to configure the project for your instance.  
  Required information:
	- valid Django secret key
	- valid PostgreSQL information
	- OAuth 42 client id and secret (if you want to use 42 OAuth)
	- Hardhat network URL (if you want to use blockchain features)
	- registered domain name, cloudflare tunnel token and tunnel id (if you want to deploy online)

  - Alteratively, provide own .env file according to the .env.template

  - Explore additional options with `make help`

# _Features_:
## _Live Chat_
  - Chat with other online users in real time
  - Send private messages to other users with `/pm <username> <message>`
  - Make mentions with `@<username>` (only works if at the beginning of a message)
  - Use commands with `/<command> <args>`
  - Command `/duel <username>` to challenge another online user to a Pong duel

## _Pong Game_
### Local
  - Play Pong on a local computer against another player or AI opponent
  - Different variants of Pong available:
	- 2D Pong
	- 3D Pong
	- 4 Player Pong

### Online
  - Play Pong online against other users

## _Tournaments_
  - Join or create tournaments to compete against other players

## _Blockchain_
  - Use blockchain to store tournament results (Opt-in feature)

# _Points:_

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

potential extras:

```
1   - Additional Game				1
1   - CLI Pong						1
1   - JWT and 2FA					1
```

