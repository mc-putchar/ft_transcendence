NAME := ft_transcendence
TITLE := "42Berlin Spectacular Transcendence"

AUTHORS := "ccattano, helauren, mcutura, tfregni"

APPS := pong chat api game
DB_USER := ft_user
DB_DATABASE := db_transcendence

SHELL := /usr/bin/bash
CLI := transcendCLI.py

# detect debian system (cloud)
ifeq ($(shell uname -a | grep -c Debian), 1)
	DC := docker-compose
	SRC := docker-compose.yml
else
	DC := docker compose
	SRC := compose.yaml
endif

local: SRC := local_compose.yml

# Colors
COLOUR_END := \033[0m
COLOUR_GREEN := \033[32m
COLOUR_RED := \033[31m
COLOUR_MAG := \033[35m
COLOUR_MAGB := \033[1;35m
COLOUR_CYN := \033[36m
COLOUR_CYNB := \033[1;36m

.PHONY: up down start stop re debug local migrate collect clean schema tests

up: .env # Beam me up Scotty
	@echo "Building and starting containers, with $(COLOUR_CYNB)$(DC)$(COLOUR_END) and $(COLOUR_MAGB)$(SRC)$(COLOUR_END)"
	$(DC) -f $(SRC) up --build

down: # Bring 'em down
	$(DC) -f $(SRC) $(MAKECMDGOALS)

start: # Start containers and detach
	$(DC) -f $(SRC) $(MAKECMDGOALS)

stop: # Stop the containers, please
	$(DC) -f $(SRC) $(MAKECMDGOALS)

re: # Re-create containers
	$(DC) -f $(SRC) up --build --force-recreate

.env:
	bash setup_wizard.sh

clitest:
	cd transcendCLI && source .venv/bin/activate && python $(CLI)

debug: # DEBUG MODE
	@echo 'using $(DC) and $(SRC)'
	$(DC) -f $(SRC) --profile debug up --build

local: up

testlogin: # Selenium tests
	# docker exec ft_transcendence-django-1 python test_selenium.py
	docker exec ft_transcendence-django-1 python test_selenium.py
	@echo "Test done"

migrate: # Make and run DB migrations
	$(DC) -f $(SRC) stop
	$(DC) -f $(SRC) run --build --rm django python manage.py makemigrations $(APPS)
	$(DC) -f $(SRC) run --rm django python manage.py migrate
	$(DC) -f $(SRC) stop

clean: # DROP database and create a new one
	$(DC) -f $(SRC) start db
	$(DC) -f $(SRC) exec db dropdb -U $(DB_USER) ${DB_DATABASE}
	$(DC) -f $(SRC) exec db createdb -U $(DB_USER) ${DB_DATABASE}
	$(DC) -f $(SRC) stop db

collect: # Collect static files to be served
	$(DC) -f $(SRC) run --rm --no-deps django python manage.py collectstatic --noinput --clear

schema: # Output OpenAPI3 Schema into pong/schema.yml
	$(DC) -f $(SRC) run --rm --no-deps django python manage.py spectacular --validate --color --file schema.yml

tests: # Run automated tests
	$(DC) -f $(SRC) start
	$(DC) -f $(SRC) run --rm django python manage.py test
	$(DC) -f $(SRC) stop

help: # Display this helpful message
	@awk 'BEGIN { \
	FS = ":.*#"; printf "Usage:\n\t$(COLOUR_CYNB)make $(COLOUR_MAGB)<target> \
	$(COLOUR_END)\n\nTargets:\n"; } \
	/^[a-zA-Z_0-9-]+:.*?#/ { \
	printf "$(COLOUR_MAGB)%-16s$(COLOUR_CYN)%s$(COLOUR_END)\n", $$1, $$2 } ' \
	Makefile
