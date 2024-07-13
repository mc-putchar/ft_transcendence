FROM python:3.10

WORKDIR /code

COPY requirements.txt /code/

# MKDIR /code/static
RUN mkdir /code/static

#RUN pip install -r requirements.txt

RUN pip install --upgrade pip wheel && \
    pip install --no-cache-dir -r requirements.txt


#RUN python manage.py collectstatic --noinput

ENV CLIENT_ID CLIENT_SECRET REDIRECT_URI

COPY . /code/
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
