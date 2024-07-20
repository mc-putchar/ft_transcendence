NAME := ft_transcendence
DB_USER := ft_user
# detect debian system (cloud)
ifeq ($(shell uname -a | grep -c Debian), 1)
	DC := docker-compose
	SRC := docker-compose.yml
else
	DC := docker compose
	SRC := compose.yaml
endif

.PHONY: up down start stop re migrate collect clean

up:
	$(DC) -f $(SRC) up --build

down start stop:
	$(DC) -f $(SRC) $(MAKECMDGOALS)

re:
	$(DC) -f $(SRC) up --build --force-recreate

migrate:
	$(DC) -f $(SRC) run django python manage.py makemigrations pong chat api
	$(DC) -f $(SRC) run django python manage.py migrate

clean:
	$(DC) -f $(SRC) up --build -d
	$(DC) -f $(SRC) exec db dropdb -U $(DB_USER) db_transcendence
	$(DC) -f $(SRC) exec db createdb -U $(DB_USER) db_transcendence
	$(DC) -f $(SRC) down
	$(MAKE) migrate

collect:
	$(DC) run django python manage.py collectstatic --noinput --clear


