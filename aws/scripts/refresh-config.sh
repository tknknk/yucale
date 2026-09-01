#!/bin/bash
# =============================================================================
# Refresh On-Instance Config for Yucale Service
# =============================================================================
# Runs ON the EC2 instance (unlike deploy.sh / build-and-push.sh, which run on
# your machine). user_data only fetches docker-compose.prod.yml and
# nginx.prod.conf.template when the instance is *created*, and
# user_data_replace_on_change is not set, so a `terraform apply` never
# re-bootstraps a running box. This script refreshes those files in place.
#
# Why a script rather than two curl commands: the files are coupled. On
# 2026-09-01, refreshing only docker-compose.yml took the site down. The compose
# file had been changed to mount ./nginx.prod.conf.template (renamed from
# nginx.prod.conf), that path did not exist on the box, Docker helpfully created
# an empty *directory* for the bind mount, the nginx entrypoint's
# `find -type f -name '*.template'` matched nothing, and nginx came up on its
# stock config serving "Welcome to nginx!". Fetching both files together, and
# checking afterwards that the template actually rendered, is what this exists
# for.
#
# Usage: sudo ./refresh-config.sh [OPTIONS]
# =============================================================================

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
APP_DIR="${APP_DIR:-/opt/yucale}"
GITHUB_REPO="${GITHUB_REPO:-tknknk/yucale}"
GIT_REF="${GIT_REF:-master}"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${CYAN}[STEP]${NC} $1"
}

show_usage() {
    cat << EOF
Usage: sudo $(basename "$0") [OPTIONS]

Refresh docker-compose.yml and nginx.prod.conf.template on a running EC2
instance from the GitHub repo, then restart the stack.

Both files are always fetched together: they are coupled, and updating one
without the other has taken the site down before.

OPTIONS:
    -d, --dir DIR       Application directory. Default: /opt/yucale
    -r, --ref REF       Git branch or tag to fetch from. Default: master
    --repo OWNER/NAME   GitHub repository. Default: tknknk/yucale
    --no-pull           Skip 'docker-compose pull' (config-only refresh)
    --no-restart        Fetch and validate only; do not touch containers
    -h, --help          Show this help message

EXAMPLES:
    sudo $(basename "$0")                  # Refresh config, pull images, restart
    sudo $(basename "$0") --no-pull        # Config change only, keep current images
    sudo $(basename "$0") --no-restart     # Stage the files, restart by hand later
    sudo $(basename "$0") -r v1.2.0        # Pin to a tag instead of master

ENVIRONMENT VARIABLES:
    APP_DIR             Application directory
    GITHUB_REPO         GitHub repository (owner/name)
    GIT_REF             Git branch or tag
EOF
}

# The compose file is named docker-compose.prod.yml in the repo but installed as
# docker-compose.yml on the box (user_data renames it), so plain `docker-compose`
# with no -f flag is what works here.
FILES_REMOTE=("docker-compose.prod.yml" "nginx.prod.conf.template")
FILES_LOCAL=("docker-compose.yml" "nginx.prod.conf.template")

# Resolve the compose binary: user_data installs the standalone v2 binary, but
# fall back to the plugin form so this also works on a box set up differently.
resolve_compose() {
    if [[ -x /usr/local/bin/docker-compose ]]; then
        COMPOSE=(/usr/local/bin/docker-compose)
    elif command -v docker-compose >/dev/null 2>&1; then
        COMPOSE=(docker-compose)
    elif docker compose version >/dev/null 2>&1; then
        COMPOSE=(docker compose)
    else
        log_error "No docker-compose found (tried /usr/local/bin/docker-compose, docker-compose, docker compose)"
        exit 1
    fi
    log_info "Using compose command: ${COMPOSE[*]}"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    command -v curl >/dev/null 2>&1 || { log_error "curl not found"; exit 1; }
    command -v docker >/dev/null 2>&1 || { log_error "docker not found"; exit 1; }

    if [[ ! -d "$APP_DIR" ]]; then
        log_error "Application directory not found: $APP_DIR"
        log_error "Is this the EC2 instance? This script runs on the box, not on your machine."
        exit 1
    fi

    if [[ ! -w "$APP_DIR" ]]; then
        log_error "$APP_DIR is not writable. Re-run with sudo."
        exit 1
    fi

    if [[ ! -f "$APP_DIR/.env" ]]; then
        log_warning "$APP_DIR/.env not found. The compose file expects DB_PASSWORD and ADMIN_EMAIL from it."
    fi

    resolve_compose
    log_success "All prerequisites met"
}

# Download both files to a staging directory. Nothing touches $APP_DIR until
# every download has succeeded, so a 404 or a dropped connection cannot leave
# the box with a half-updated pair of files.
fetch_files() {
    log_step "Fetching config from ${GITHUB_REPO}@${GIT_REF}..."

    local raw_base="https://raw.githubusercontent.com/${GITHUB_REPO}/${GIT_REF}"
    local i

    for i in "${!FILES_REMOTE[@]}"; do
        local remote="${FILES_REMOTE[$i]}"
        local staged="${STAGE_DIR}/${FILES_LOCAL[$i]}"

        # -f so an HTTP error page is never written into the file as if it were
        # config. That failure mode is quiet and very confusing later.
        if ! curl -fsSL --retry 5 --retry-delay 2 -o "$staged" "${raw_base}/${remote}"; then
            log_error "Failed to download ${raw_base}/${remote}"
            log_error "Nothing has been changed in $APP_DIR."
            exit 1
        fi

        if [[ ! -s "$staged" ]]; then
            log_error "Downloaded ${remote} is empty. Nothing has been changed in $APP_DIR."
            exit 1
        fi

        log_info "  fetched ${remote} ($(wc -c < "$staged") bytes)"
    done

    log_success "Downloaded ${#FILES_REMOTE[@]} files"
}

# Validate the staged compose file before it replaces the live one. Needs .env
# and the nginx template alongside it, so validate inside the staging directory
# with .env linked in.
validate_staged() {
    log_step "Validating staged config..."

    if [[ -f "$APP_DIR/.env" ]]; then
        cp "$APP_DIR/.env" "${STAGE_DIR}/.env"
    fi

    if ! (cd "$STAGE_DIR" && "${COMPOSE[@]}" config -q 2>&1); then
        log_error "Staged docker-compose.yml is not valid. Nothing has been changed in $APP_DIR."
        exit 1
    fi

    rm -f "${STAGE_DIR}/.env"
    log_success "Compose file is valid"
}

install_files() {
    log_step "Installing config into $APP_DIR..."

    local backup_dir="${APP_DIR}/.config-backup"
    mkdir -p "$backup_dir"

    local changed=0
    local f
    for f in "${FILES_LOCAL[@]}"; do
        local staged="${STAGE_DIR}/${f}"
        local live="${APP_DIR}/${f}"

        # Docker creates an empty directory when a bind-mount source is missing.
        # That is what turned a partial refresh into an outage on 2026-09-01, so
        # clear it out rather than letting `cp` fail confusingly.
        if [[ -d "$live" ]]; then
            log_warning "$live is a directory (left behind by a bind mount of a missing file) — removing it"
            rmdir "$live" 2>/dev/null || rm -rf "$live"
        fi

        if [[ -f "$live" ]] && cmp -s "$staged" "$live"; then
            log_info "  $f unchanged"
            continue
        fi

        if [[ -f "$live" ]]; then
            cp -p "$live" "${backup_dir}/${f}"
            log_info "  $f updated (previous version backed up to ${backup_dir}/${f})"
        else
            log_info "  $f created"
        fi

        cp "$staged" "$live"
        changed=1
    done

    # nginx.prod.conf was renamed to nginx.prod.conf.template. Leaving the old
    # file around is harmless but misleading when troubleshooting.
    if [[ -f "${APP_DIR}/nginx.prod.conf" ]]; then
        mv "${APP_DIR}/nginx.prod.conf" "${backup_dir}/nginx.prod.conf"
        log_info "  removed superseded nginx.prod.conf (moved to ${backup_dir}/)"
    fi

    if [[ $changed -eq 0 ]]; then
        log_success "Config already up to date"
    else
        log_success "Config installed"
    fi
}

restart_stack() {
    cd "$APP_DIR"

    if [[ "${DO_PULL}" == "true" ]]; then
        log_step "Pulling images..."
        "${COMPOSE[@]}" pull
        log_success "Images pulled"
    else
        log_info "Skipping image pull (--no-pull)"
    fi

    log_step "Starting containers..."
    "${COMPOSE[@]}" up -d
    log_success "Containers started"
}

# The check that would have caught the 2026-09-01 outage in seconds. nginx falls
# back to its stock config when no template is found, which looks like a working
# container serving the wrong site rather than like a failure.
verify_nginx() {
    log_step "Verifying nginx rendered the template..."

    local i
    for i in $(seq 1 30); do
        if [[ "$(docker inspect -f '{{.State.Running}}' yucale_nginx 2>/dev/null)" == "true" ]]; then
            break
        fi
        sleep 1
    done

    if [[ "$(docker inspect -f '{{.State.Running}}' yucale_nginx 2>/dev/null)" != "true" ]]; then
        log_error "yucale_nginx is not running. Check: ${COMPOSE[*]} logs nginx"
        return 1
    fi

    # envsubst writes /etc/nginx/nginx.conf from the template. If it did not run,
    # the stock config is still in place and it contains no origin_verified map.
    if docker exec yucale_nginx sh -c 'grep -q origin_verified /etc/nginx/nginx.conf' 2>/dev/null; then
        log_success "nginx is serving the generated config"
        return 0
    fi

    log_error "nginx is running on its STOCK config — the site will show 'Welcome to nginx!'"
    log_error "envsubst did not render the template. Check:"
    log_error "  ${COMPOSE[*]} logs nginx | grep envsubst"
    log_error "  docker exec yucale_nginx ls -la /etc/nginx/templates/"
    log_error "Most likely /opt/yucale/nginx.prod.conf.template is a directory rather than a file."
    return 1
}

show_status() {
    log_step "Stack status"
    echo ""
    cd "$APP_DIR"
    "${COMPOSE[@]}" ps
    echo ""
}

# Parse arguments
DO_PULL=true
DO_RESTART=true

while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--dir)
            APP_DIR="$2"
            shift 2
            ;;
        -r|--ref)
            GIT_REF="$2"
            shift 2
            ;;
        --repo)
            GITHUB_REPO="$2"
            shift 2
            ;;
        --no-pull)
            DO_PULL=false
            shift
            ;;
        --no-restart)
            DO_RESTART=false
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Show banner
echo ""
echo "======================================"
echo " Yucale Config Refresh"
echo "======================================"
echo " App dir:    ${APP_DIR}"
echo " Repository: ${GITHUB_REPO}"
echo " Ref:        ${GIT_REF}"
echo "======================================"
echo ""

check_prerequisites

STAGE_DIR="$(mktemp -d)"
trap 'rm -rf "$STAGE_DIR"' EXIT

fetch_files
validate_staged
install_files

if [[ "${DO_RESTART}" != "true" ]]; then
    log_warning "Skipping restart (--no-restart). Apply with: cd ${APP_DIR} && ${COMPOSE[*]} up -d"
    exit 0
fi

restart_stack
show_status

if ! verify_nginx; then
    exit 1
fi

echo ""
log_success "Refresh complete"
echo ""
log_info "Verify from your machine:"
log_info "  curl -s -o /dev/null -w '%{http_code}\\n' https://<cloudfront-domain>/api/health"
