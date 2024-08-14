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

.PHONY: up down start stop re debug swapmode clitest testlogin migrate clean collect schema tests help

up: .env # Beam me up, Scotty
	@echo -e "Deploying $(COLOUR_GREEN)${DOMAIN}$(COLOUR_END)"
	@echo -e "Building and starting containers, with $(COLOUR_CYNB)$(DC)$(COLOUR_END) and $(COLOUR_MAGB)$(SRC)$(COLOUR_END)"
	$(DC) -f $(SRC) $@ --build

down: # Bring 'em down
	$(DC) -f $(SRC) $@

start: # Start containers and detach
	$(DC) -f $(SRC) $@

stop: # Stop the containers, please
	$(DC) -f $(SRC) $@

re: # Re-create containers
	$(DC) -f $(SRC) up --build --force-recreate

.env:
	bash setup_wizard.sh

debug: # DEBUG MODE
	@echo -e 'using $(DC) and $(SRC)'
	$(DC) -f $(SRC) --profile debug up --build

swapmode: .env stop # Swap online/local mode (requires restart)
	$(shell \
	if [[ -f .env_deploy ]]; then \
		{ mv -f .env .env_local; mv -f .env_deploy .env; } \
	elif [[ -f .env_local ]]; then \
		{ mv -f .env .env_deploy; mv -f .env_local .env; } \
	fi )
	$(info Mode swapped.)

clitest: # CLI test
	cd transcendCLI && source .venv/bin/activate && python $(CLI)

testlogin: # Selenium tests
	# docker exec ft_transcendence-django-1 python test_selenium.py
	docker exec ft_transcendence-django-1 python test_selenium.py
	@echo "Test done"

migrate: # Make and run DB migrations
	$(DC) -f $(SRC) stop
	$(DC) -f $(SRC) run --build --rm django python manage.py makemigrations $(APPS)
	$(DC) -f $(SRC) run --rm django python manage.py migrate
	$(DC) -f $(SRC) stop

clean: # DROP database volume and recreate a new one (Warning: all database data will be irreversibly lost! Consider making backup)
	$(MAKE) down
	docker volume rm $(NAME)_dbdata

collect: # Collect static files to be served
	$(DC) -f $(SRC) run --rm --no-deps django python manage.py collectstatic --noinput --clear

schema: # Output OpenAPI3 Schema into pong/schema.yml
	$(DC) -f $(SRC) run --rm --no-deps django python manage.py spectacular --validate --color --file schema.yml
	lolcat -a pong/schema.yml || cat pong/schema.yml

newkey: # Generate a new secret key for Django
	$(DC) -f $(SRC) run --rm --no-deps django python manage.py shell -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

tests: # Run automated tests
	$(DC) -f $(SRC) start
	@echo "Testing smart contract"
	@docker exec -it ft_transcendence-blockchain-1 sh -c "npx hardhat test" 
	$(DC) -f $(SRC) run --rm django python manage.py test
	$(DC) -f $(SRC) stop

help: # Display this helpful message
	@awk 'BEGIN { \
	FS = ":.*#"; printf "Usage:\n\t$(COLOUR_CYNB)make $(COLOUR_MAGB)<target> \
	$(COLOUR_END)\n\nTargets:\n"; } \
	/^[a-zA-Z_0-9-]+:.*?#/ { \
	printf "$(COLOUR_MAGB)%-16s$(COLOUR_CYN)%s$(COLOUR_END)\n", $$1, $$2 } ' \
	Makefile
