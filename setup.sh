#!/bin/sh

# Exit immediately if a command exits with a non-zero status
set -e
# Exit if any command in a pipeline fails
set -o pipefail
# Exit if undefined variables are used
set -u

## TODO: ADD SERVER INSTALLATION FUNCTIONALITY WITH ANSIBLE.

# Configuration
DEFAULT_ENV="dev"
CONFIG_FILE_DEV=".ssh.dev.env"
CONFIG_FILE_PROD=".ssh.prod.env"
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

get_environment() {
    case "${1:-}" in
        --prod)
            echo "prod"
            ;;
        --dev|"")
            echo "dev"
            ;;
        *)
            error_exit "Invalid environment flag. Use --dev or --prod"
            ;;
    esac
}

get_config_file() {
    case "$1" in
        prod)
            echo "$CONFIG_FILE_PROD"
            ;;
        dev)
            echo "$CONFIG_FILE_DEV"
            ;;
    esac
}

load_config() {
    local env=$1
    local config_file=$(get_config_file "$env")

    if [ ! -f "$config_file" ]; then
        error_exit "Configuration file $config_file not found.\n\nPlease create it by copying the example file:\ncp .ssh.example.env $config_file\n\nThen update the values in $config_file with your $env server details:\n- SSH_HOST: Your $env server hostname\n- SSH_USER: SSH username\n- SSH_KEY: Path to your SSH private key\n- REMOTE_PROJECT_PATH: Path to project on remote server"
    fi
    . "./$config_file"

    # Validate required environment variables
    for var in SSH_USER SSH_HOST SSH_KEY REMOTE_PROJECT_PATH; do
        if [ -z "$(eval echo \$$var)" ]; then
            error_exit "$var must be set in $config_file"
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
    local env=$(get_environment "${1:-}")
    load_config "$env"
    # Add confirmation for production deployments
    if [ "$env" = "prod" ]; then
        echo -e "\n[WARNING]: You are about to deploy to PRODUCTION environment!"
        echo -e "Server: $SSH_HOST"
        echo -e "\nAre you sure you want to continue? (y/N): "
        read -r confirm
        case "$confirm" in
            [Yy]*)
                echo "Proceeding with production deployment..."
                ;;
            *)
                error_exit "Deployment cancelled"
                ;;
        esac
    fi

    log "Updating application in $env environment..."
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
    local env=$(get_environment "$1")
    log "Checking service status in $env environment..."
    load_config "$env"
    test_ssh_connection
    ssh -i "$SSH_KEY" "$SSH_USER@$SSH_HOST" \
        "cd ${REMOTE_PROJECT_PATH} && docker compose -f $DOCKER_COMPOSE_FILE ps" || \
        error_exit "Failed to check status"
}

view_logs() {
    local env=$(get_environment "$1")
    log "Viewing logs in $env environment..."
    load_config "$env"
    test_ssh_connection

    SERVICE=$3
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
        shift  # Remove 'update' from arguments
        update "$@"
        ;;
    status)
        shift  # Remove 'status' from arguments
        check_status "$@"
        ;;
    logs)
        shift  # Remove 'logs' from arguments
        view_logs "$@"
        ;;
    *)
        echo "Usage: $0 [command] [--dev|--prod] [options]"
        echo "Commands:"
        echo "  update              Update existing installation"
        echo "  status             Check services status"
        echo "  logs [service]     View service logs (optional: specify service name)"
        echo ""
        echo "Environments:"
        echo "  --dev              Deploy to development environment (default)"
        echo "  --prod             Deploy to production environment"
        exit 1
        ;;
esac
