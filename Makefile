
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

migrate:
	$(DC) run web python manage.py makemigrations pong
	$(DC) run web python manage.py migrate

