# detect debian system (cloud)
ifeq ($(shell uname -a | grep -c Debian), 1)
	DOCKER := docker
	DC := docker-compose
else
	DC := docker compose
endif

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
	$(DC) run web python manage.py makemigrations pong chat
	$(DC) run web python manage.py migrate

collect:
	$(DC) run web python manage.py collectstatic --noinput --clear


