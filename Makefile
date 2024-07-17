# detect debian system (cloud)
ifeq ($(shell uname -a | grep -c Debian), 1)
	DOCKER := docker
	DC := docker-compose
else
	DC := docker compose
endif

.PHONY: up down start stop re migrate collect
up:
	$(DC) up --build
down:
	$(DC) down
start:
	$(DC) start
stop:
	$(DC) stop

re:
	$(DC) --build --force-recreate

migrate:
	$(DC) run django python manage.py makemigrations pong chat api
	$(DC) run django python manage.py migrate

collect:
	$(DC) run django python manage.py collectstatic --noinput --clear

clean:
	$(DC) run web python manage.py flush --noinput
	$(DC) exec db psql -U postgres -c "DROP DATABASE pong"
