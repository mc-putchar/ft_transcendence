## DEBUG
After the container is up you can trigger the script needed, for now test_selenium.py is the only script available.

Needs user foo and bar to be created in the database.
with passwd foo bar

```bash
- we need --profile debug to use selenium from the compose file

```bash
❯ docker-compose --profile debug up --build --force-recreate

#command to trigger selenium test exec $containerName .. ..
docker exec ft_transcendence-django-1 python test_selenium.py
```

connect to the vnc server
```bash
vncviewer 0.0.0.0:5900
```

passwd = secret
