#!/bin/bash
# =============================================================================
# Health Check + Discord Alerting for Yucale Service
# =============================================================================
# Runs ON the EC2 instance, from cron, once an hour. Reports to Discord only
# when something needs attention.
#
# Why not CloudWatch: the agent on this box is configured to publish
# mem_used_percent to the "Yucale" namespace, but the instance role
# (aws/terraform/ec2.tf, aws_iam_role_policy.ec2_cloudwatch) grants only
# logs:* — no cloudwatch:PutMetricData — so those metrics never arrive and
# there is nothing to alarm on. Beyond that, host memory would not have caught
# any of the failures this project actually hit: metaspace exhaustion inside
# the JVM, a container restarting on its own, or nginx serving its stock
# "Welcome to nginx!" page. Those are visible from the box, not from the
# hypervisor, and the Discord webhook the app already uses is right there in
# .env.
#
# Known limitation: this runs on the machine it watches, so it is not a dead
# man's switch. If the instance is down or wedged, no alert is sent — nothing
# reports that nothing reported. A CloudWatch StatusCheckFailed alarm covers
# that case and needs no IAM changes; it complements this rather than
# competing with it.
#
# Usage: sudo ./health-check.sh [OPTIONS]
# =============================================================================

set -uo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default values
APP_DIR="${APP_DIR:-/opt/yucale}"
STATE_FILE="${STATE_FILE:-/var/lib/yucale/health-state}"

# Thresholds
MEM_WARN_PCT="${MEM_WARN_PCT:-85}"
MEM_CRIT_PCT="${MEM_CRIT_PCT:-95}"
DISK_WARN_PCT="${DISK_WARN_PCT:-80}"
DISK_CRIT_PCT="${DISK_CRIT_PCT:-90}"
HOST_AVAIL_WARN_MB="${HOST_AVAIL_WARN_MB:-100}"

# How long an unchanged problem stays quiet before it is repeated, so a
# condition that persists for days does not post every hour.
RENOTIFY_HOURS="${RENOTIFY_HOURS:-6}"

CONTAINERS=(yucale_backend yucale_frontend yucale_db yucale_nginx)

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

Check the Yucale stack and post to Discord when something needs attention.
Intended to run hourly from cron; safe to run by hand at any time.

Reports on: container state and health, restarts since the last run, per-
container memory against its limit, host memory, disk, end-to-end HTTP through
nginx, and any heap dump or OutOfMemoryError left by the backend.

OPTIONS:
    -d, --dir DIR       Application directory. Default: /opt/yucale
    -n, --dry-run       Run the checks and print the report; send nothing
    -f, --force         Send to Discord even if nothing changed since last run
    --install-cron      Install the hourly cron entry and exit
    -h, --help          Show this help message

EXIT CODES:
    0   all checks passed
    1   at least one warning
    2   at least one critical finding

EXAMPLES:
    sudo $(basename "$0") --dry-run     # See the report without notifying
    sudo $(basename "$0") --force       # Send a report now, whatever the state
    sudo $(basename "$0") --install-cron

ENVIRONMENT VARIABLES:
    APP_DIR             Application directory
    STATE_FILE          Where the previous run's state is kept
    MEM_WARN_PCT        Container memory warning threshold (default 85)
    MEM_CRIT_PCT        Container memory critical threshold (default 95)
    DISK_WARN_PCT       Disk warning threshold (default 80)
    DISK_CRIT_PCT       Disk critical threshold (default 90)
    HOST_AVAIL_WARN_MB  Host available-memory warning floor in MB (default 100)
    RENOTIFY_HOURS      Hours before an unchanged problem is repeated (default 6)
EOF
}

# -----------------------------------------------------------------------------
# Findings
# -----------------------------------------------------------------------------
# Collected as "LEVEL|check|message" so the report, the Discord payload and the
# change-detection signature all read from one list.
FINDINGS=()
DETAILS=()

add_finding() {
    FINDINGS+=("$1|$2|$3")
}

add_detail() {
    DETAILS+=("$1")
}

worst_level() {
    local level=OK f
    for f in "${FINDINGS[@]:-}"; do
        [[ -z "$f" ]] && continue
        case "${f%%|*}" in
            CRIT) echo CRIT; return ;;
            WARN) level=WARN ;;
        esac
    done
    echo "$level"
}

# -----------------------------------------------------------------------------
# Checks
# -----------------------------------------------------------------------------

check_containers() {
    log_step "Checking containers..."

    local name running health
    for name in "${CONTAINERS[@]}"; do
        running=$(docker inspect -f '{{.State.Running}}' "$name" 2>/dev/null || echo "missing")

        if [[ "$running" == "missing" ]]; then
            add_finding CRIT "container" "$name does not exist"
            continue
        fi
        if [[ "$running" != "true" ]]; then
            local exit_code oom
            exit_code=$(docker inspect -f '{{.State.ExitCode}}' "$name" 2>/dev/null || echo "?")
            oom=$(docker inspect -f '{{.State.OOMKilled}}' "$name" 2>/dev/null || echo "?")
            add_finding CRIT "container" "$name is not running (exit=$exit_code, oom-killed=$oom)"
            continue
        fi

        # Only nginx has no healthcheck defined; the rest report a status.
        health=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$name" 2>/dev/null || echo none)
        if [[ "$health" != "healthy" && "$health" != "none" ]]; then
            add_finding CRIT "health" "$name healthcheck is $health"
        fi
    done
}

# A restart is the visible trace of a crash. Since ExitOnOutOfMemoryError was
# added the JVM exits and comes straight back, which fixed the five-hour silent
# degradation but also means an OOM now leaves no other sign. This is what turns
# that recovery back into something a human hears about.
check_restarts() {
    log_step "Checking restart counts..."

    local name count previous
    for name in "${CONTAINERS[@]}"; do
        count=$(docker inspect -f '{{.RestartCount}}' "$name" 2>/dev/null || echo "")
        [[ -z "$count" ]] && continue

        NEW_RESTART_STATE+=("restart_${name}=${count}")
        previous="${PREV_RESTARTS[$name]:-}"

        if [[ -n "$previous" && "$count" -gt "$previous" ]]; then
            add_finding CRIT "restart" "$name restarted $((count - previous)) time(s) since the last check (total $count)"
        fi
    done
}

check_memory() {
    log_step "Checking container memory..."

    # One docker stats call for every container: it is slow enough per call to
    # be worth batching.
    local line name usage pct limit
    while read -r line; do
        name=$(echo "$line" | awk '{print $1}')
        usage=$(echo "$line" | awk '{print $2}')
        limit=$(echo "$line" | awk '{print $4}')
        pct=$(echo "$line" | awk '{print $5}' | tr -d '%' | cut -d. -f1)

        [[ -z "$pct" ]] && continue
        add_detail "$name: $usage / $limit (${pct}%)"

        if [[ "$pct" -ge "$MEM_CRIT_PCT" ]]; then
            add_finding CRIT "memory" "$name at ${pct}% of its limit ($usage / $limit)"
        elif [[ "$pct" -ge "$MEM_WARN_PCT" ]]; then
            add_finding WARN "memory" "$name at ${pct}% of its limit ($usage / $limit)"
        fi
    done < <(docker stats --no-stream --format '{{.Name}} {{.MemUsage}} {{.MemPerc}}' "${CONTAINERS[@]}" 2>/dev/null)
}

check_host() {
    log_step "Checking host resources..."

    # Both readings are validated before they are compared. A monitor that
    # raises a false alarm gets muted, and then it is not a monitor -- so an
    # unparseable value is reported as unknown rather than as a breach.
    local avail_mb disk_pct
    if command -v free >/dev/null 2>&1; then
        avail_mb=$(free -m | awk '/^Mem:/ {print $7}')
        if [[ "$avail_mb" =~ ^[0-9]+$ ]]; then
            add_detail "host memory available: ${avail_mb} MB"
            if [[ "$avail_mb" -lt "$HOST_AVAIL_WARN_MB" ]]; then
                add_finding WARN "host-memory" "only ${avail_mb} MB available on the host"
            fi
        else
            add_detail "host memory available: unknown"
        fi
    fi

    disk_pct=$(df -P / 2>/dev/null | awk 'NR==2 {print $5}' | tr -d '%')
    if [[ "$disk_pct" =~ ^[0-9]+$ ]] && [[ "$disk_pct" -le 100 ]]; then
        add_detail "disk /: ${disk_pct}% used"
        if [[ "$disk_pct" -ge "$DISK_CRIT_PCT" ]]; then
            add_finding CRIT "disk" "root filesystem ${disk_pct}% full"
        elif [[ "$disk_pct" -ge "$DISK_WARN_PCT" ]]; then
            add_finding WARN "disk" "root filesystem ${disk_pct}% full"
        fi
    else
        add_detail "disk /: unknown"
    fi
}

# End-to-end through nginx, which is the only check that exercises the path a
# visitor actually takes. It is also the one that catches nginx falling back to
# its stock config -- a failure that leaves every container up and healthy while
# the site serves the wrong page.
check_endpoint() {
    log_step "Checking HTTP through nginx..."

    local curl_args=(-sS --max-time 10)
    # nginx 403s anything without the shared secret when origin verification is
    # switched on, so a local probe has to present it too.
    if [[ -n "${ORIGIN_VERIFY_SECRET:-}" ]]; then
        curl_args+=(-H "X-Origin-Verify: ${ORIGIN_VERIFY_SECRET}")
    fi

    # `|| code=000` rather than `|| echo 000`: on a connection failure curl has
    # already printed 000 through -w, so appending another reads as "000000".
    local code
    code=$(curl "${curl_args[@]}" -o /dev/null -w '%{http_code}' http://localhost:3000/api/health 2>/dev/null) || code=000
    add_detail "GET /api/health: $code"
    if [[ "$code" != "200" ]]; then
        add_finding CRIT "endpoint" "GET /api/health returned $code through nginx"
    fi

    local body
    body=$(curl "${curl_args[@]}" http://localhost:3000/ 2>/dev/null || echo "")
    if echo "$body" | grep -qi "Welcome to nginx"; then
        add_finding CRIT "nginx-config" "nginx is serving its stock config (see 'Welcome to nginx!' in aws/README.md)"
    fi
}

# The heap dump only exists if the JVM died of an OutOfMemoryError. It survives
# a restart, so this reports the incident even when the container came back
# before anyone noticed.
check_jvm() {
    log_step "Checking for JVM OOM evidence..."

    local dump
    dump=$(docker exec yucale_backend sh -c 'ls -1 /tmp/*.hprof 2>/dev/null' 2>/dev/null || echo "")
    if [[ -n "$dump" ]]; then
        add_finding CRIT "jvm-oom" "heap dump present in yucale_backend ($(echo "$dump" | tr '\n' ' ')) — the JVM hit an OutOfMemoryError"
    fi

    local oom_lines
    oom_lines=$(docker logs --since 2h yucale_backend 2>&1 | grep -c "OutOfMemoryError" || true)
    if [[ "${oom_lines:-0}" -gt 0 ]]; then
        add_finding CRIT "jvm-oom" "$oom_lines OutOfMemoryError line(s) in the last 2h of backend logs"
    fi
}

# -----------------------------------------------------------------------------
# State (previous restart counts, last alert signature, last notify time)
# -----------------------------------------------------------------------------

declare -A PREV_RESTARTS=()
NEW_RESTART_STATE=()
PREV_SIGNATURE=""
PREV_NOTIFIED=0

load_state() {
    [[ -f "$STATE_FILE" ]] || return 0

    local line key value
    while IFS='=' read -r key value; do
        case "$key" in
            signature) PREV_SIGNATURE="$value" ;;
            notified_at) PREV_NOTIFIED="$value" ;;
            restart_*) PREV_RESTARTS["${key#restart_}"]="$value" ;;
        esac
    done < "$STATE_FILE"
}

save_state() {
    local signature="$1" notified_at="$2"
    mkdir -p "$(dirname "$STATE_FILE")"
    {
        echo "signature=${signature}"
        echo "notified_at=${notified_at}"
        printf '%s\n' "${NEW_RESTART_STATE[@]:-}"
    } > "$STATE_FILE"
}

# -----------------------------------------------------------------------------
# Reporting
# -----------------------------------------------------------------------------

build_report() {
    local level="$1" f
    # An alert that cannot say which machine it came from is a poor alert, so
    # this falls back rather than leaving the field blank.
    local host
    host=$(hostname 2>/dev/null || cat /etc/hostname 2>/dev/null || echo "${HOSTNAME:-unknown}")
    [[ -z "$host" ]] && host="unknown"

    if [[ "$level" == "OK" && -n "$PREV_SIGNATURE" ]]; then
        printf '**Yucale health: recovered**\nHost: `%s`\nAll checks are passing again.\n' "$host"
    elif [[ "$level" == "OK" ]]; then
        printf '**Yucale health: OK**\nHost: `%s`\nAll checks passed.\n' "$host"
    else
        printf '**Yucale health: %s**\nHost: `%s`\n\n' "$level" "$host"
        for f in "${FINDINGS[@]:-}"; do
            [[ -z "$f" ]] && continue
            printf '%s `%s` %s\n' \
                "$([[ "${f%%|*}" == "CRIT" ]] && echo ':red_circle:' || echo ':warning:')" \
                "$(echo "$f" | cut -d'|' -f2)" \
                "$(echo "$f" | cut -d'|' -f3-)"
        done
        printf '\n'
    fi

    printf '\n__Current state__\n'
    for f in "${DETAILS[@]:-}"; do
        [[ -z "$f" ]] && continue
        printf '%s\n' "$f"
    done
}

# Discord rejects a payload with unescaped control characters, and the report is
# multi-line with backticks and non-ASCII in it, so the JSON is built by a real
# encoder rather than by string concatenation.
#
# There is deliberately no sed fallback. One was written and then removed: it
# produced invalid JSON for exactly this report (verified on amazonlinux:2023),
# which Discord would reject with a 400 while the script reported success. A
# monitor with a silently broken notification path is worse than one that
# refuses to start, and python3 ships with Amazon Linux 2023 at /usr/bin/python3.
json_escape() {
    python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'
}

send_discord() {
    local report="$1"

    if [[ -z "${DISCORD_WEBHOOK_URL:-}" ]]; then
        log_warning "DISCORD_WEBHOOK_URL is not set in ${APP_DIR}/.env — printing instead of sending"
        return 0
    fi

    local escaped
    escaped=$(printf '%s' "$report" | json_escape)

    local code
    code=$(curl -sS --max-time 15 -o /dev/null -w '%{http_code}' \
        -H 'Content-Type: application/json' \
        -d "{\"content\": ${escaped}}" \
        "$DISCORD_WEBHOOK_URL" 2>/dev/null) || code=000

    # Discord answers 204 No Content on success.
    if [[ "$code" == "204" || "$code" == "200" ]]; then
        log_success "Notification sent to Discord"
        return 0
    fi
    log_error "Discord webhook returned $code"
    return 1
}

install_cron() {
    local script_path
    script_path="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
    local entry="17 * * * * root ${script_path} >> /var/log/yucale-health.log 2>&1"

    # A file in cron.d rather than a crontab edit, so re-running this is
    # idempotent instead of appending a duplicate entry every time.
    printf '# Yucale hourly health check. Installed by health-check.sh --install-cron\n%s\n' "$entry" \
        > /etc/cron.d/yucale-health
    chmod 644 /etc/cron.d/yucale-health

    log_success "Installed /etc/cron.d/yucale-health"
    log_info "Runs at 17 minutes past every hour; output goes to /var/log/yucale-health.log"
}

# Parse arguments
DRY_RUN=false
FORCE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--dir)
            APP_DIR="$2"
            shift 2
            ;;
        -n|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        --install-cron)
            install_cron
            exit 0
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

command -v docker >/dev/null 2>&1 || { log_error "docker not found"; exit 1; }
# Required for the Discord payload; see json_escape. Checked up front so a
# missing interpreter surfaces on the first manual run rather than at the moment
# an alert needs to go out.
command -v python3 >/dev/null 2>&1 || { log_error "python3 not found (needed to build the Discord payload)"; exit 1; }

# The webhook and the origin secret both live in the app's .env. Sourced in a
# subshell-safe way: only the two keys we need, so a stray line in .env cannot
# execute anything.
if [[ -f "${APP_DIR}/.env" ]]; then
    DISCORD_WEBHOOK_URL=$(grep -E '^DISCORD_WEBHOOK_URL=' "${APP_DIR}/.env" | head -1 | cut -d= -f2- || true)
    ORIGIN_VERIFY_SECRET=$(grep -E '^ORIGIN_VERIFY_SECRET=' "${APP_DIR}/.env" | head -1 | cut -d= -f2- || true)
else
    log_warning "${APP_DIR}/.env not found"
fi

load_state

check_containers
check_restarts
check_memory
check_host
check_endpoint
check_jvm

LEVEL=$(worst_level)
REPORT=$(build_report "$LEVEL")

echo ""
echo "$REPORT"
echo ""

# Signature covers the findings but not the numbers inside them, so a container
# drifting 86% -> 87% does not read as a new problem every hour.
SIGNATURE=$(for f in "${FINDINGS[@]:-}"; do [[ -n "$f" ]] && echo "$f" | cut -d'|' -f1,2; done | sort -u | tr '\n' ',')
NOW=$(date +%s)

if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Dry run — nothing sent"
elif [[ "$FORCE" == "true" ]]; then
    send_discord "$REPORT"
    save_state "$SIGNATURE" "$NOW"
elif [[ -n "$SIGNATURE" ]]; then
    # Something is wrong: notify on a change, or once the quiet period lapses.
    if [[ "$SIGNATURE" != "$PREV_SIGNATURE" ]] || (( NOW - PREV_NOTIFIED >= RENOTIFY_HOURS * 3600 )); then
        send_discord "$REPORT"
        save_state "$SIGNATURE" "$NOW"
    else
        log_info "Same findings as the last notification — staying quiet until ${RENOTIFY_HOURS}h have passed"
        save_state "$SIGNATURE" "$PREV_NOTIFIED"
    fi
elif [[ -n "$PREV_SIGNATURE" ]]; then
    # Was failing, now clean: say so, so silence is never ambiguous.
    send_discord "$REPORT"
    save_state "" "$NOW"
else
    log_success "All checks passed"
    save_state "" "$PREV_NOTIFIED"
fi

case "$LEVEL" in
    CRIT) exit 2 ;;
    WARN) exit 1 ;;
    *)    exit 0 ;;
esac
