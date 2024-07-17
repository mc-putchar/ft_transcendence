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
down:
	$(DC) -f $(SRC) down
start:
	$(DC) -f $(SRC) start
stop:
	$(DC) -f $(SRC) stop

re:
	$(DC) -f $(SRC) --build --force-recreate

migrate:
	$(DC) run web python manage.py makemigrations pong chat
	$(DC) run web python manage.py migrate

collect:
	$(DC) run web python manage.py collectstatic --noinput --clear


