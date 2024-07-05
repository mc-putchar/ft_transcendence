
DOCKER := docker
DC := docker-compose

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
	$(DC) run web python manage.py makemigrations pong
	$(DC) run web python manage.py migrate

collect:
	$(DC) run web python manage.py collectstatic --noinput --clear


