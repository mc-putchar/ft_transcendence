### How to run:



if not on docker first create a virtual env:
```bash
   python3 -m venv testenv
   source testenv/bin/activate
   pip install --upgrade pip
   pip install -r requirements.txt
   python manage.py migrate
```

to run the server:

```bash
python manage.py runserver 4222
```

Adding users via script:
   - Neat way to init the db to test things, runs a command in django shell that can do operations, in this case adding an user
```bash
cat createusers.py | python manage.py shell
```
### Architecture:
Django templates are used to render the html pages, and passed to the frontend in a single
element in the page "app" div. There is a router that listens to the url changes and renders the
correct page at static/js/router.js

### Testing:
- [V] refresh 
- [V] login
- [V] logout
- [V] register
- [ ] refresh while on login/register view
