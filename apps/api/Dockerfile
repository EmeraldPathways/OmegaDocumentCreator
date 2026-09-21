FROM postgres:16 AS postgres-client

FROM python:3.13-slim

# Keep backup/restore tooling on the same PostgreSQL major version as the
# production database service.  The generic Debian client package can move
# ahead of the pinned postgres:16 server and emit restore commands that the
# server does not understand.
COPY --from=postgres-client /usr/lib/postgresql/16 /usr/lib/postgresql/16
ENV PATH="/usr/lib/postgresql/16/bin:${PATH}"

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get install --yes --no-install-recommends postgresql-client libreoffice-core \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml /app/pyproject.toml
COPY app /app/app
COPY migrations /app/migrations

RUN pip install --no-cache-dir .

CMD ["sh", "-c", "python -m app.migrate && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
