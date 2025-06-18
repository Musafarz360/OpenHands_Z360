#!/bin/bash
set -eo pipefail

echo "Starting OpenHands..."

if [[ $NO_SETUP == "true" ]]; then
  echo "Skipping setup, running as $(whoami)"
  "$@"
  exit 0
fi

if [ "$(id -u)" -ne 0 ]; then
  echo "The OpenHands entrypoint.sh must run as root"
  exit 1
fi

if [ -z "$SANDBOX_USER_ID" ]; then
  echo "SANDBOX_USER_ID is not set"
  exit 1
fi

if [ -z "$WORKSPACE_MOUNT_PATH" ]; then
  unset WORKSPACE_BASE
fi

if [[ "$SANDBOX_USER_ID" -eq 0 ]]; then
  echo "Running OpenHands as root"
  export RUN_AS_OPENHANDS=false

  if [[ "$ENABLE_VSCODE" == "true" ]]; then
    echo "Starting VS Code Server (as root)..."
    code-server --auth none --bind-addr 0.0.0.0:${SANDBOX_VSCODE_PORT:-41234} /opt/workspace_base &
  fi

  exec "$@"
else
  echo "Setting up enduser with id $SANDBOX_USER_ID"

  if ! id "enduser" &>/dev/null; then
    if ! useradd -l -m -u "$SANDBOX_USER_ID" -s /bin/bash enduser; then
      echo "Failed to create user enduser with id $SANDBOX_USER_ID. Moving openhands user."
      incremented_id=$((SANDBOX_USER_ID + 1))
      usermod -u "$incremented_id" openhands
      if ! useradd -l -m -u "$SANDBOX_USER_ID" -s /bin/bash enduser; then
        echo "Failed to create user enduser with id $SANDBOX_USER_ID for a second time. Exiting."
        exit 1
      fi
    fi
  else
    echo "User enduser already exists. Skipping creation."
  fi

  usermod -aG app enduser

  DOCKER_SOCKET_GID=$(stat -c '%g' /var/run/docker.sock)
  echo "Docker socket group id: $DOCKER_SOCKET_GID"
  if ! getent group "$DOCKER_SOCKET_GID" > /dev/null; then
    echo "Creating group with id $DOCKER_SOCKET_GID"
    groupadd -g "$DOCKER_SOCKET_GID" docker
  fi
  usermod -aG "$DOCKER_SOCKET_GID" enduser

  mkdir -p /home/enduser/.cache/huggingface/hub/
  chown -R enduser:enduser /home/enduser/.cache

  echo "Running as enduser"

  if [[ "$ENABLE_VSCODE" == "true" ]]; then
    echo "Starting VS Code Server (as enduser)..."
    su enduser -c "code-server --auth none --bind-addr 0.0.0.0:${SANDBOX_VSCODE_PORT:-41234} /opt/workspace_base" &
  fi

  su enduser -c "${*@Q}"
fi

