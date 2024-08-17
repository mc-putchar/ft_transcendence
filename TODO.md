## TODO:

### Documentation:
	- [x] README.md
	- [ ] LICENSE
	- [x] API schema
	- [ ] Dependencies and their justifications
	- [ ] ? code documentation

###  Email-validator?:

### Features:
	- [ ] Minimal technical requirements:
		- [x] Framework: Django
		- [x] Database: PostgreSQL
		- [x] Frontend: Vanilla JS + Bootstrap
		- [x] SPA
		- [x] Google Chrome compatibility
		- [ ] no unhandled errors or warnings
		- [x] single command line launch (make)
		- [x] Docker runtime files must be located in /goinfre or /sgoinfre
		- [x] no “bind-mount volumes” between the host and the container if non-root UIDs are used in the container
		- [ ] Game:
			- [x] remote players (+ 42 OAuth)
			- [ ] tournament system
			- [x] registration with User Management
			- [x] matchmaking
			- [x] same universal rules for all players and AI
			- [x] Graphics: 2D and 3D
		- [ ] Security:
			- [x] password hashing
			- [x] SQL injection/XSS protection
			- [x] mandatory https:// and wss://
			- [?] form and input server side validation
			- [x] JWT auth

	- [ ] User customization options:
		- [x] mandatory
		- [ ] game settings:
			- [ ] sound preferences
			- [ ] default Pong client variant (2D/3D/any other)
		- [ ] user settings:
			- [x] on change of profile picture, overwrite old one if not default
			- [ ] change email
			- [ ] validate user email
				- [ ] password recovery
				- [ ] ? easy 2FA on top
			- [ ] change password
			- [x] anonymize account (ensure no personal data is stored)
			- [ ] delete account (adjust cascading in db on delete)
			- [x] resolve 42 acount username conflict
			- [ ] connect 42 account (after conventional registration)
			- [ ] ? display blockchain user address? status? (after optin)
		- [ ] custom paddle texture:
			- [ ] provide defaults
			- [ ] ? visualize with 3D model
			- [ ] ? hats:
				- i dunno, ppl like hats

	- [ ] chat:
		- [x] mandatory
		- [ ] change message log container from textarea
		- [ ] special style for private messages and announcements
		- [ ] add some chat history (maybe with redis)
		- [ ] validate challenged/mentioned user is in online user list
		- [ ] expand commands list
		- [ ] ? chat spam detection
		- [ ] ? chat rooms (lobby, tournament, game, private)
		- [ ] ? chat emoji :p

	- [ ] online game:
		- [x] mandatory
		- [x] server side game logic
		- [ ] 2D client option
		- [x] 3D client option
		- [ ] mobile controls
		- [ ] improve predictive client
		- [ ] global matchmaking
		- [ ] spectating mode

	- [ ] tournaments:
		- [ ] mandatory:
			- [x] tournament history
			- [x] create, join, leave, start, delete tournaments
			- [x] try harder to make players show up for the match
			- [ ] websocket updates
			- [x] tournament round progressions
			- [x] tournament finalization
			- [ ] tournament rewards
		- [ ] presentation:
			- [x] list tournaments
			- [x] tournament details
			- [ ] tournament brackets
			- [ ] tournament results
		- [ ] ? customizations

	- [ ] swag:
		- [x] notifications
		- [ ] modals:
			- [ ] need better controls over them (closing, dissmissing, persisting)
			- [ ] improve look
		- [ ] sound controls
		- [ ] ensure device support
		- [ ] ? tooltips

### Security:
	- [x] JWT auth
	- [x] refresh tokens
	- [ ] input validation
	- [ ] rate limiting
	- [ ] ? make websockets cooperate with WAF
	- [ ] secure headers
	- [x] secure cookies
	- [x] secure password storage
	- [?] secure session storage
	- [ ] secure data storage, processing and disposal
	- [ ] secure logging and error handling
	- [x] secure build process
	- [x] secure deployment process
	- [ ] secure maintenance
	- [ ] secure decommissioning (time to pull the plug and rethink life)

### Testing:
	- [ ] unit tests
	- [ ] API tests
	- [ ] selenium tests
	- [ ] pentesting

### Performance:
	- [ ] dead code elimination
	- [ ] THREE.js loading optimization
	- [ ] image compression and optimization
	- [x] lazy loading
	- [ ] ? web/service workers
	- [ ] ? http/2
	- [ ] ? http/3  (what is this?)
	- [ ] ? prepare for webassembly (footuristic)

### CI/CD:
	- [x] statusrobot monitor
	- [ ] github actions:
		- [ ] testing
		- [ ] deployment

### CLI:
	- [x] login
	- [x] my profile
	- [ ] friends and blocked users
	- [ ] chat socket
	- [ ] game socket
	- [ ] tournament socket
	- [ ] arrange display
