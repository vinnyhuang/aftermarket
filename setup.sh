#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e
# Exit if any command in a pipeline fails
set -o pipefail
# Exit if undefined variables are used
set -u

## TODO: ADD SERVER INSTALLATION FUNCTIONALITY WITH ANSIBLE.

# Configuration
CONFIG_FILE=".ssh.env"
DOCKER_COMPOSE_FILE="docker/docker-compose.yaml"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error_exit() {
    log "ERROR: $1" >&2
    exit 1
}

check_requirements() {
    command -v ssh >/dev/null 2>&1 || error_exit "SSH client is not installed"
}

load_config() {
    if [ ! -f "$CONFIG_FILE" ]; then
        error_exit "Please create a $CONFIG_FILE file with the required variables."
    fi
    . "./$CONFIG_FILE"

    # Validate required environment variables
    for var in SSH_USER SSH_HOST SSH_KEY REMOTE_PROJECT_PATH; do
        if [ -z "$(eval echo \$$var)" ]; then
            error_exit "$var must be set in $CONFIG_FILE"
        fi
    done
}

test_ssh_connection() {
    log "Testing SSH connection to $SSH_HOST..."
    if ! ssh -i "$SSH_KEY" -o ConnectTimeout=10 "$SSH_USER@$SSH_HOST" exit; then
        error_exit "SSH connection failed"
    fi
}

update() {
    log "Updating application..."
    load_config
    test_ssh_connection

    # First, update the remote repository to get all new branches
    log "Fetching latest changes from remote repository..."
    ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" \
        "cd ${REMOTE_PROJECT_PATH} && git fetch --all" || error_exit "Failed to fetch updates"

    # Get list of branches locally
    log "Available branches:"
    BRANCHES=$(ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" \
        "cd ${REMOTE_PROJECT_PATH} && git branch -r | grep -v HEAD | sed 's/origin\///' | nl -w2 -s') '")
    echo "$BRANCHES"

    # Ask for branch selection locally (not through SSH)
    echo "\nEnter the number of the branch you want to deploy (or press Enter for current branch):"
    read branch_number

    # Determine target branch
    if [ -n "$branch_number" ]; then
        target_branch=$(echo "$BRANCHES" | sed -n "${branch_number}p" | sed 's/^[[:space:]0-9]*) //')
        if [ -z "$target_branch" ]; then
            error_exit "Invalid branch number selected"
        fi
        log "Deploying branch: $target_branch"
    else
        target_branch=$(ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" \
            "cd ${REMOTE_PROJECT_PATH} && git branch --show-current")
        log "Keeping current branch: $target_branch"
    fi

    # Execute deployment with the selected branch
    ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" /bin/sh <<EOF || error_exit "Remote command execution failed"
        set -e
        cd "${REMOTE_PROJECT_PATH}"

        echo "Switching to branch: $target_branch"
        git checkout $target_branch
        git pull origin $target_branch

        changed_files=\$(git diff --name-only HEAD@{1} HEAD)

        if [ -n "\$changed_files" ]; then
            echo "Changed files:"
            echo "\$changed_files" | sed 's/^/  /'
        fi

        if echo "\$changed_files" | grep -q '^apps/backend/\|^docker/'; then
            echo "🔄 Backend changes detected - Rebuilding backend container..."
            docker compose -f "$DOCKER_COMPOSE_FILE" build backend
            docker compose -f "$DOCKER_COMPOSE_FILE" up -d backend
            echo "✅ Backend updated successfully"
        fi

        if echo "\$changed_files" | grep -q '^apps/frontend/\|^docker/'; then
            echo "🔄 Frontend changes detected - Rebuilding frontend container..."
            docker compose -f "$DOCKER_COMPOSE_FILE" build frontend
            docker compose -f "$DOCKER_COMPOSE_FILE" up -d frontend
            echo "✅ Frontend updated successfully"
        fi

        if [ -z "\$changed_files" ]; then
            echo "ℹ️  No changes detected - Restarting containers..."
            docker compose -f "$DOCKER_COMPOSE_FILE" up -d
            echo "✅ Containers restarted successfully"
        fi

        echo "\n📊 Current container status:"
        docker compose -f "$DOCKER_COMPOSE_FILE" ps --format 'table {{.Name}}\t{{.Status}}'
EOF
}

check_status() {
    log "Checking service status..."
    load_config
    test_ssh_connection
    ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" \
        "cd ${REMOTE_PROJECT_PATH} && docker compose -f $DOCKER_COMPOSE_FILE ps" || \
        error_exit "Failed to check status"
}

view_logs() {
    log "Viewing logs..."
    load_config
    test_ssh_connection

    SERVICE=$2
    if [ -n "$SERVICE" ]; then
        ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" \
            "cd ${REMOTE_PROJECT_PATH} && docker compose -f $DOCKER_COMPOSE_FILE logs -f $SERVICE" || \
            error_exit "Failed to view logs for $SERVICE"
    else
        ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" \
            "cd ${REMOTE_PROJECT_PATH} && docker compose -f $DOCKER_COMPOSE_FILE logs -f" || \
            error_exit "Failed to view logs"
    fi
}

# Main script
check_requirements

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
