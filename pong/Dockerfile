FROM python:3.12.4-slim

WORKDIR /code
COPY requirements.txt .
RUN mkdir static

RUN apt-get update && \
	apt-get install -y gcc musl-dev python3-dev libffi-dev

RUN pip install --upgrade pip wheel && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
