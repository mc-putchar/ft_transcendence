NAME := ft_transcendence

TITLE := "42Berlin Spectacular Transcendence"
AUTHORS := "ccattano, helauren, mcutura, tfregni"

SHELL := /usr/bin/bash

APPS := pong chat api game blockchain
CLI := transcendCLI.py

# Read .env
ifneq (,$(wildcard ./.env))
	include .env
	export
endif

ifneq (, ${DEPLOY})
	PROFILE := tunnel
else
	PROFILE := local
endif

# detect debian system (cloud)
ifeq ($(shell uname -a | grep -c Debian), 1)
	DC := docker-compose
	SRC := docker-compose.yml
else
	DC := docker compose --profile $(PROFILE)
	SRC := compose.yaml
endif

# Colors
COLOUR_END := \033[0m
COLOUR_GREEN := \033[32m
COLOUR_RED := \033[31m
COLOUR_MAG := \033[35m
COLOUR_MAGB := \033[1;35m
COLOUR_CYN := \033[36m
COLOUR_CYNB := \033[1;36m

.PHONY: help up down start stop re logs logs-django ps db-shell migrate debug clean shred collect schema newkey swapmode maintenance clitest testlogin tests testblockchain

help: # Display this helpful message
	@awk 'BEGIN { \
	FS = ":.*#"; printf "Usage:\n\t$(COLOUR_CYNB)make $(COLOUR_MAGB)<target> \
	$(COLOUR_END)\n\nTargets:\n"; } \
	/^[a-zA-Z_0-9-]+:.*?#/ { \
	printf "$(COLOUR_MAGB)%-16s$(COLOUR_CYN)%s$(COLOUR_END)\n", $$1, $$2 } ' \
	Makefile

.env:
	bash setup_wizard.sh

up: .env # Beam me up, Scotty
	$(info "Aye, aye Cap'n!")
	@echo -e "Deploying $(COLOUR_GREEN)${DOMAIN}$(COLOUR_END)"
	@echo -e "Building and starting containers, with $(COLOUR_CYNB)$(DC)$(COLOUR_END) and $(COLOUR_MAGB)$(SRC)$(COLOUR_END)"
	@rm -f pong/static/maintenance.on
	$(DC) -f $(SRC) $@ --build -d
down: # Bring 'em down
	$(DC) -f $(SRC) $@
start: # Start containers and detach
	$(DC) -f $(SRC) $@
stop: # Stop the containers, please
	$(DC) -f $(SRC) $@
re: stop # Re-create containers
	$(DC) -f $(SRC) up --build --force-recreate -d

logs: # Tail the logs 
	$(DC) -f $(SRC) logs --tail=100 -f
logs-django: # Tail the Django logs
	$(DC) -f $(SRC) logs --tail=100 -f django
ps: # Show running containers
	$(DC) -f $(SRC) ps
db-shell: # Run database shell
	$(DC) -f $(SRC) exec db psql $(POSTGRES_DB) -U $(POSTGRES_USER)
migrate: # Make and run DB migrations
	$(DC) -f $(SRC) stop
	$(DC) -f $(SRC) run --build --rm -e SKIP_DEPLOYMENT=true django python manage.py makemigrations $(APPS)
	$(DC) -f $(SRC) run --rm -e SKIP_DEPLOYMENT=true django python manage.py migrate
	$(DC) -f $(SRC) stop

clean: # clean docker system
	docker system prune
shred: down # DROP database (Warning: all database data will be irreversibly lost! Consider making backup)
	@docker volume rm $(NAME)_dbdata
	@$(MAKE) -s newkey
	@echo -e "$(COLOUR_GREEN)^^Here^^$(COLOUR_END) is a new Django key for you, if you need it"

collect: # Collect static files to be served
	$(DC) -f $(SRC) run --rm --no-deps -e SKIP_DEPLOYMENT=true django python manage.py collectstatic --noinput --clear

schema: # Output OpenAPI3 Schema into pong/schema.yml
	$(DC) -f $(SRC) run --rm --no-deps -e SKIP_DEPLOYMENT=true django python manage.py spectacular --validate --color --file schema.yml
	lolcat -a pong/schema.yml || cat pong/schema.yml

newkey: # Generate a new secret key for Django
	$(DC) -f $(SRC) run --rm --no-deps -e SKIP_DEPLOYMENT=true django python manage.py shell -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

swapmode: .env stop # Swap online/local mode (requires restart)
	$(shell \
	if [[ -f .env_deploy ]]; then \
		{ mv -f .env .env_local; mv -f .env_deploy .env; } \
	elif [[ -f .env_local ]]; then \
		{ mv -f .env .env_deploy; mv -f .env_local .env; } \
	fi )
	$(info Mode swapped.)

maintenance:
	touch pong/static/maintenance.on
	$(DC) -f $(SRC) stop blockchain
	$(DC) -f $(SRC) stop django
	$(DC) -f $(SRC) stop db
	$(DC) -f $(SRC) stop redis

debug: # DEBUG MODE
	@echo -e 'using $(DC) and $(SRC)'
	$(DC) -f $(SRC) --profile debug up --build

cli CLI: # run CLI
	@if [[ ! -d transcendCLI/.venv ]]; then \
		{ echo -e "$(COLOUR_CYNB)Setting up virtual environment...$(COLOUR_END)"; \
		python3 -m venv transcendCLI/.venv && \
		pip install -r transcendCLI/requirements.txt && \
		exit 0; } \
	fi
	cd transcendCLI && source .venv/bin/activate && python $(CLI) --url=$(DOMAIN)

testlogin: # Selenium tests
	# docker exec ft_transcendence-django-1 python test_selenium.py
	docker exec ft_transcendence-django-1 python test_selenium.py
	@echo "Test done"

testcontract: # Run smart contract tests (run while containers are not running)
	@echo -e "$(COLOUR_MAGB)Testing smart contract$(COLOUR_END)"
	$(DC) -f $(SRC) run --rm blockchain npx hardhat test
	$(DC) -f $(SRC) stop

testblockchain:	# Run blockchain tests (run while containers are running)
	@echo -e "$(COLOUR_MAGB)Testing committing data to the blockchain$(COLOUR_END)"
	@echo -e "$(COLOUR_GREEN)Adding matches$(COLOUR_END)"
	docker exec -it ft_transcendence-django-1 python manage.py test blockchain.tests.AddMatchViewTest
	@echo -e "$(COLOUR_GREEN)Adding tournaments$(COLOUR_END)"
	docker exec -it ft_transcendence-django-1 python manage.py test blockchain.tests.CommitTournamentViewTest