#!/usr/bin/env bash
# harden-vps.sh — Idempotent hardening for LoanKit Tailscale staging VPS (Ubuntu 24.04 + Docker).
# Run as user `quan` with sudo NOPASSWD or interactive sudo. Re-runnable safely.
#
# Usage:
#   bash scripts/harden-vps.sh                       # apply all
#   bash scripts/harden-vps.sh --skip-tailscale-tls  # skip cert step
#   bash scripts/harden-vps.sh --dry-run             # print actions, no changes
#
# Assumes: app deployed at $APP_DIR (default ~/loankit), docker compose up.

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
APP_DIR="${APP_DIR:-$HOME/loankit}"
APP_USER="${APP_USER:-$(whoami)}"
DATA_DIR="${APP_DIR}/data"
BACKUP_DIR="${APP_DIR}/backups"
ENV_FILE="${APP_DIR}/.env.production"
COMPOSE_FILE="${APP_DIR}/docker-compose.yml"
NODE_UID=1000  # alpine node user
DRY_RUN=0
SKIP_TS_TLS=0

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --skip-tailscale-tls) SKIP_TS_TLS=1 ;;
    -h|--help)
      grep '^#' "$0" | head -20
      exit 0
      ;;
  esac
done

# ── Helpers ───────────────────────────────────────────────────────────────────
log()  { printf '\033[1;36m[harden]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }
err()  { printf '\033[1;31m[err]\033[0m %s\n' "$*" >&2; }

run() {
  if (( DRY_RUN )); then
    printf '\033[2m  $ %s\033[0m\n' "$*"
  else
    eval "$@"
  fi
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { err "Missing required command: $1"; exit 1; }
}

# ── Pre-flight ────────────────────────────────────────────────────────────────
log "Pre-flight checks"
require_cmd sudo
require_cmd docker
require_cmd tailscale

if [[ ! -d "$APP_DIR" ]]; then
  err "APP_DIR not found: $APP_DIR"; exit 1
fi

(( DRY_RUN )) && log "DRY-RUN — no changes will be applied"

# ── 1. .env.production permissions ────────────────────────────────────────────
log "1/8 Securing .env.production permissions"
if [[ -f "$ENV_FILE" ]]; then
  run "chmod 600 '$ENV_FILE'"
  run "chown '$APP_USER:$APP_USER' '$ENV_FILE'"
  log "    → $ENV_FILE set to 600"
else
  warn "    → $ENV_FILE missing (skip)"
fi

# ── 2. Data dir ownership for non-root container ──────────────────────────────
log "2/8 Fixing data dir ownership for non-root container (UID $NODE_UID)"
run "mkdir -p '$DATA_DIR' '$BACKUP_DIR'"
run "sudo chown -R $NODE_UID:$NODE_UID '$DATA_DIR'"
run "sudo chmod 750 '$DATA_DIR'"

# ── 3. UFW firewall — verify only Tailscale + SSH ─────────────────────────────
log "3/8 UFW firewall verification"
if ! sudo ufw status | grep -q "Status: active"; then
  warn "    → UFW not active — enabling with safe defaults"
  run "sudo ufw default deny incoming"
  run "sudo ufw default allow outgoing"
  run "sudo ufw allow ssh"
  run "sudo ufw allow in on tailscale0"
  run "sudo ufw --force enable"
else
  # Idempotent: ensure tailscale0 allowed
  if ! sudo ufw status | grep -q "tailscale0"; then
    run "sudo ufw allow in on tailscale0"
  fi
  log "    → UFW already active"
fi
sudo ufw status verbose | head -15

# ── 4. Tailscale Serve HTTPS ──────────────────────────────────────────────────
if (( SKIP_TS_TLS )); then
  log "4/8 Skipping Tailscale Serve HTTPS (--skip-tailscale-tls)"
else
  log "4/8 Tailscale Serve HTTPS → 127.0.0.1:3000"
  TS_HOSTNAME=$(tailscale status --json | python3 -c 'import sys,json; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))' 2>/dev/null || echo "")
  if [[ -z "$TS_HOSTNAME" ]]; then
    warn "    → Could not resolve tailnet hostname; skip cert+serve"
  else
    log "    → tailnet hostname: $TS_HOSTNAME"
    run "sudo tailscale cert '$TS_HOSTNAME' || true"
    # Tailscale Serve idempotent: re-applying same config is no-op
    run "sudo tailscale serve --bg --https=443 http://localhost:3000"
    log "    → URL: https://$TS_HOSTNAME"
    log "    → REMINDER: set BETTER_AUTH_URL=https://$TS_HOSTNAME and ENABLE_HSTS=true in $ENV_FILE"
  fi
fi

# ── 5. Daily SQLite backup cron ───────────────────────────────────────────────
log "5/8 Daily SQLite backup cron"
CRON_FILE=/etc/cron.d/loankit-backup
CRON_BODY="# Daily DB backup at 02:00 — managed by harden-vps.sh
0 2 * * * $APP_USER cd $APP_DIR && /usr/bin/docker compose exec -T loankit sh -c 'sqlite3 /app/data/loankit.db \".backup /app/data/backup-\$(date +\\%Y\\%m\\%d).db\"' && find $DATA_DIR -name 'backup-*.db' -mtime +7 -delete
"
if (( DRY_RUN )); then
  printf '\033[2m  → would write %s with daily backup rule\033[0m\n' "$CRON_FILE"
else
  echo "$CRON_BODY" | sudo tee "$CRON_FILE" >/dev/null
  sudo chmod 644 "$CRON_FILE"
  log "    → $CRON_FILE installed"
fi

# ── 6. Docker daemon log rotation (host-wide fallback) ────────────────────────
log "6/8 Docker daemon log rotation"
DAEMON_JSON=/etc/docker/daemon.json
if [[ -f "$DAEMON_JSON" ]] && grep -q '"max-size"' "$DAEMON_JSON" 2>/dev/null; then
  log "    → daemon.json already has log rotation"
else
  if (( DRY_RUN )); then
    printf '\033[2m  → would write %s with log-opts max-size=10m\033[0m\n' "$DAEMON_JSON"
  else
    sudo mkdir -p /etc/docker
    echo '{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "5" }
}' | sudo tee "$DAEMON_JSON" >/dev/null
    log "    → $DAEMON_JSON written"
    warn "    → Restart docker for daemon.json to take effect: sudo systemctl restart docker"
  fi
fi

# ── 7. Disk + memory monitor cron ─────────────────────────────────────────────
log "7/8 Disk + memory monitor (cron, syslog warn at 80%)"
MONITOR_SCRIPT=/usr/local/bin/loankit-monitor.sh
MONITOR_BODY='#!/bin/sh
set -eu
DISK=$(df -h / | awk "NR==2 {gsub(/%/,\"\",\$5); print \$5}")
MEM=$(free | awk "NR==2 {printf \"%d\", \$3*100/\$2}")
[ "$DISK" -gt 80 ] && logger -t loankit-monitor "DISK HIGH: ${DISK}%"
[ "$MEM"  -gt 85 ] && logger -t loankit-monitor "MEM HIGH:  ${MEM}%"
exit 0
'
if (( DRY_RUN )); then
  printf '\033[2m  → would write %s + cron entry\033[0m\n' "$MONITOR_SCRIPT"
else
  echo "$MONITOR_BODY" | sudo tee "$MONITOR_SCRIPT" >/dev/null
  sudo chmod +x "$MONITOR_SCRIPT"
  echo "*/15 * * * * root $MONITOR_SCRIPT" | sudo tee /etc/cron.d/loankit-monitor >/dev/null
  log "    → monitor installed (every 15 min)"
fi

# ── 8. Container restart with new compose ─────────────────────────────────────
log "8/8 Reminder: rebuild + restart container"
cat <<EOF

──────────────────────────────────────────────────────────────────
NEXT MANUAL STEPS:

  1. Edit $ENV_FILE:
     - BETTER_AUTH_URL=https://<tailnet-hostname>
     - ENABLE_HSTS=true

  2. Rebuild + restart:
     cd $APP_DIR
     git pull
     docker compose build
     docker compose up -d

  3. Verify:
     curl -fsS https://<tailnet-hostname>/api/health
     docker compose ps        # healthy
     sudo ufw status verbose

  4. Existing user sessions will be invalidated by HTTPS cookie
     change — users must log in again (expected).
──────────────────────────────────────────────────────────────────
EOF

log "Done."
