# EA Forests model API for Google Cloud Run.
# Earth Engine authenticates through the Cloud Run service account (Application Default
# Credentials); no key file is baked into the image. Set EARTH_ENGINE_PROJECT at deploy time.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8080

WORKDIR /srv/backend

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY alembic.ini ./
COPY migrations ./migrations

RUN useradd --create-home --uid 10001 api
USER api

EXPOSE 8080
# One worker keeps the in-process result cache and async run registry coherent; scale with
# Cloud Run instances and --concurrency instead of extra workers.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --workers 1 --timeout-keep-alive 75"]
