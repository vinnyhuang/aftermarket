#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e


## TODO: ADD SERVER INSTALLATION FUNCTIONALITY WITH ANSIBLE.
# Load environment variables from .env file
if [ -f .env ]; then
    . ./.env
else
    echo "Please create a .env file with the required variables."
    exit 1
fi

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error_exit() {
    log "ERROR: $1"
    exit 1
}

update() {
    log "Updating application..."
    # Read variables from .env
    . ./.env
    if [ -z "$SSH_USER" ] || [ -z "$SSH_HOST" ] || [ -z "$SSH_KEY" ] || [ -z "$REMOTE_PROJECT_PATH" ]; then
        error_exit "SSH_USER, SSH_HOST, SSH_KEY, and REMOTE_PROJECT_PATH must be set in .env file."
    }

    log "Connecting to $SSH_HOST..."
    # Test SSH connection first
    ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" exit || error_exit "SSH connection failed"

    ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" /bin/sh <<EOF
        cd "${REMOTE_PROJECT_PATH}" || exit 1
        echo "Pulling latest changes..."
        git pull
        changed_files=\$(git diff --name-only HEAD@{1} HEAD)

        if [ -n "\$changed_files" ]; then
            echo "Changed files:"
            echo "\$changed_files" | sed 's/^/  /'
        fi

        if echo "\$changed_files" | grep -q '^apps/backend/\|^docker/'; then
            echo "🔄 Backend changes detected - Rebuilding backend container..."
            docker compose -f docker/docker-compose.yaml build backend
            docker compose -f docker/docker-compose.yaml up -d backend
            echo "✅ Backend updated successfully"
        fi
        if echo "\$changed_files" | grep -q '^apps/frontend/\|^docker/'; then
            echo "🔄 Frontend changes detected - Rebuilding frontend container..."
            docker compose -f docker/docker-compose.yaml build frontend
            docker compose -f docker/docker-compose.yaml up -d frontend
            echo "✅ Frontend updated successfully"
        fi
        if [ -z "\$changed_files" ]; then
            echo "ℹ️  No changes detected - Restarting containers..."
            docker compose -f docker/docker-compose.yaml up -d
            echo "✅ Containers restarted successfully"
        fi

        echo "\n📊 Current container status:"
        docker compose -f docker/docker-compose.yaml ps --format 'table {{.Name}}\t{{.Status}}'
EOF
}

# Check service status
check_status() {
    log "Checking service status..."
    if [ -z "$SSH_USER" ] || [ -z "$SSH_HOST" ] || [ -z "$SSH_KEY" ] || [ -z "$REMOTE_PROJECT_PATH" ]; then
        error_exit "SSH_USER, SSH_HOST, SSH_KEY, and REMOTE_PROJECT_PATH must be set in .env file."
    fi
    ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "cd ${REMOTE_PROJECT_PATH} && docker compose -f docker/docker-compose.yaml ps"
}

# View logs
view_logs() {
    log "Viewing logs..."
    if [ -z "$SSH_USER" ] || [ -z "$SSH_HOST" ] || [ -z "$SSH_KEY" ] || [ -z "$REMOTE_PROJECT_PATH" ]; then
        error_exit "SSH_USER, SSH_HOST, SSH_KEY, and REMOTE_PROJECT_PATH must be set in .env file."
    fi

    SERVICE=$2
    if [ -n "$SERVICE" ]; then
        ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "cd ${REMOTE_PROJECT_PATH} && docker compose -f docker/docker-compose.yaml logs -f $SERVICE"
    else
        ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" "cd ${REMOTE_PROJECT_PATH} && docker compose -f docker/docker-compose.yaml logs -f"
    fi
}

# Cleanup functionality
cleanup() {
    log "Cleaning up old Docker images and volumes..."
    docker image prune -f
    docker volume prune -f
}

# Main script
case "$1" in
    update)
        update
        ;;
    status)
        check_status
        ;;
    logs)
        view_logs "$@"
        ;;
    *)
        echo "Usage: $0 [command]"
        echo "Commands:"
        echo "  update              Update existing installation"
        echo "  status             Check services status"
        echo "  logs [service]     View service logs (optional: specify service name)"
        exit 1
        ;;
esac
