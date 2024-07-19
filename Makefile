NAME := ft_transcendence

# detect debian system (cloud)
ifeq ($(shell uname -a | grep -c Debian), 1)
	DC := docker-compose
	SRC := docker-compose.yml
else
	DC := docker compose
	SRC := compose.yaml
endif


.PHONY: up down start stop re migrate collect
up:
	$(DC) -f $(SRC) up --build
down start stop:
	$(DC) -f $(SRC) $(MAKECMDGOALS)

re:
	$(DC) -f $(SRC) --build --force-recreate

migrate:
	$(DC) -f $(SRC) run django python manage.py makemigrations pong chat
	$(DC) -f $(SRC) run django python manage.py migrate

collect:
	$(DC) -f $(SRC) run django python manage.py collectstatic --noinput --clear


