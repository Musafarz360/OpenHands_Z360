# Stage 1: Frontend Build
ARG OPENHANDS_BUILD_VERSION=dev
FROM node:24.2.0-bookworm-slim AS frontend-builder

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend ./
RUN npm run build

# Stage 2: Backend Build
FROM python:3.12.10-slim AS base
FROM base AS backend-builder

WORKDIR /app
ENV PYTHONPATH='/app'

ENV POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_IN_PROJECT=1 \
    POETRY_VIRTUALENVS_CREATE=1 \
    POETRY_CACHE_DIR=/tmp/poetry_cache

RUN apt-get update -y \
    && apt-get install -y curl make git build-essential \
    && python3 -m pip install poetry --break-system-packages

COPY pyproject.toml poetry.lock ./
RUN touch README.md
RUN export POETRY_CACHE_DIR && poetry install --no-root && rm -rf $POETRY_CACHE_DIR

# Stage 3: Final App Image
FROM base AS openhands-app

WORKDIR /app

ARG OPENHANDS_BUILD_VERSION

# Environment configuration
ENV RUN_AS_OPENHANDS=true
ENV OPENHANDS_USER_ID=42420
ENV SANDBOX_LOCAL_RUNTIME_URL=http://host.docker.internal
ENV USE_HOST_NETWORK=false
ENV WORKSPACE_BASE=/opt/workspace_base
ENV OPENHANDS_BUILD_VERSION=$OPENHANDS_BUILD_VERSION
ENV SANDBOX_USER_ID=0
ENV FILE_STORE=local
ENV FILE_STORE_PATH=/.openhands-state
ENV ENABLE_VSCODE=true
ENV ENABLE_VSCODE_PASSWORD=false

RUN mkdir -p $FILE_STORE_PATH $WORKSPACE_BASE

# Install system utilities & code-server
RUN apt-get update -y \
    && apt-get install -y curl sudo ssh gnupg git build-essential \
    && curl -fsSL https://code-server.dev/install.sh | sh \
    && rm -rf /var/lib/apt/lists/*

# Adjust UID range for macOS host compatibility
RUN sed -i 's/^UID_MIN.*/UID_MIN 499/' /etc/login.defs \
 && sed -i 's/^UID_MAX.*/UID_MAX 1000000/' /etc/login.defs

# Add openhands user and permissions
RUN groupadd app \
 && useradd -l -m -u $OPENHANDS_USER_ID -s /bin/bash openhands \
 && usermod -aG app openhands \
 && usermod -aG sudo openhands \
 && echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers \
 && chown -R openhands:app /app && chmod -R 770 /app \
 && chown -R openhands:app $WORKSPACE_BASE && chmod -R 770 $WORKSPACE_BASE

USER openhands

# Environment settings for Python and Poetry
ENV VIRTUAL_ENV=/app/.venv \
    PATH="/app/.venv/bin:$PATH" \
    PYTHONPATH='/app'

# Backend environment
COPY --chown=openhands:app --chmod=770 --from=backend-builder ${VIRTUAL_ENV} ${VIRTUAL_ENV}

# Copy project code and permissions
COPY --chown=openhands:app --chmod=770 ./microagents ./microagents
COPY --chown=openhands:app --chmod=770 ./openhands ./openhands
COPY --chown=openhands:app --chmod=777 ./openhands/runtime/plugins ./openhands/runtime/plugins
COPY --chown=openhands:app pyproject.toml poetry.lock README.md MANIFEST.in LICENSE ./

# Pre-download models/assets (as openhands user)
RUN python openhands/core/download.py

# Correct group permissions
RUN find /app \! -group app -exec chgrp app {} +

# Copy frontend and entrypoint
COPY --chown=openhands:app --chmod=770 --from=frontend-builder /app/build ./frontend/build
COPY --chown=openhands:app --chmod=770 ./containers/app/entrypoint.sh /app/entrypoint.sh

# Switch back to root to run entrypoint
USER root
WORKDIR /app

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["uvicorn", "openhands.server.listen:app", "--host", "0.0.0.0", "--port", "3000"]

