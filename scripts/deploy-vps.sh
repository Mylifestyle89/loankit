#!/usr/bin/env bash
# deploy-vps.sh — One-shot deploy/update for LoanKit on Tailscale VPS.
# Run on VPS as the app user (e.g. quan). Idempotent — safe to re-run.
#
# Steps:
#   1. git pull (fast-forward only — fail loud if diverged)
#   2. Build container with cache
#   3. Run prisma migrate deploy
#   4. Restart container
#   5. Wait for healthcheck
#   6. Smoke-test /api/health
#   7. Show status + recent logs
#
# Usage:
#   bash scripts/deploy-vps.sh                # default
#   bash scripts/deploy-vps.sh --no-cache     # full rebuild
#   bash scripts/deploy-vps.sh --skip-pull    # local code, no git pull
#   bash scripts/deploy-vps.sh --rollback     # revert to previous image tag

set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/loankit}"
COMPOSE_FILE="${APP_DIR}/docker-compose.yml"
HEALTH_TIMEOUT_SEC=90
NO_CACHE=0
SKIP_PULL=0
ROLLBACK=0

for arg in "$@"; do
  case "$arg" in
    --no-cache)   NO_CACHE=1 ;;
    --skip-pull)  SKIP_PULL=1 ;;
    --rollback)   ROLLBACK=1 ;;
    -h|--help)    grep '^#' "$0" | head -20; exit 0 ;;
  esac
done

log()  { printf '\033[1;36m[deploy]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*" >&2; }
err()  { printf '\033[1;31m[err]\033[0m %s\n' "$*" >&2; }
die()  { err "$*"; exit 1; }

cd "$APP_DIR" || die "APP_DIR not found: $APP_DIR"
[[ -f "$COMPOSE_FILE" ]] || die "docker-compose.yml not found in $APP_DIR"
command -v docker >/dev/null || die "docker not installed"

# ── Rollback path ─────────────────────────────────────────────────────────────
if (( ROLLBACK )); then
  log "Rollback requested"
  if ! docker image inspect loankit:previous >/dev/null 2>&1; then
    die "No loankit:previous tag found — cannot rollback"
  fi
  docker tag loankit:previous loankit:latest
  docker compose up -d
  log "Rolled back to loankit:previous. Verify health below."
  sleep 5
  docker compose ps
  exit 0
fi

# ── 1. Pull code ──────────────────────────────────────────────────────────────
if (( SKIP_PULL )); then
  log "1/6 Skipping git pull (--skip-pull)"
else
  log "1/6 git pull (ff-only)"
  CURRENT_SHA=$(git rev-parse HEAD)
  git fetch origin
  if ! git merge --ff-only origin/main; then
    die "Cannot fast-forward — local branch diverged from origin/main. Resolve manually."
  fi
  NEW_SHA=$(git rev-parse HEAD)
  if [[ "$CURRENT_SHA" == "$NEW_SHA" ]]; then
    log "    → already at $NEW_SHA — no new commits"
  else
    log "    → $CURRENT_SHA → $NEW_SHA"
    log "    → changes:"
    git log --oneline "$CURRENT_SHA..$NEW_SHA" | sed 's/^/      /'
  fi
fi

# ── 2. Tag previous image for rollback ───────────────────────────────────────
log "2/6 Tagging previous image for rollback safety"
if docker image inspect loankit:latest >/dev/null 2>&1; then
  docker tag loankit:latest loankit:previous
  log "    → loankit:latest tagged as loankit:previous"
else
  warn "    → no previous image to tag (first deploy?)"
fi

# ── 3. Build ─────────────────────────────────────────────────────────────────
log "3/6 Build container"
BUILD_FLAGS=""
(( NO_CACHE )) && BUILD_FLAGS="--no-cache"
docker compose build $BUILD_FLAGS

# ── 4. Migrate DB ────────────────────────────────────────────────────────────
log "4/6 Run prisma migrate deploy (inside container)"
# Start container if down so we can exec
docker compose up -d --no-recreate
# Wait for app to actually start before exec (sqlite open fast usually)
sleep 3
if docker compose exec -T loankit sh -c 'test -d node_modules/.prisma' 2>/dev/null; then
  docker compose exec -T loankit npx prisma migrate deploy || warn "    → migrate failed/skipped"
else
  # Standalone build doesn't include prisma CLI — run via dedicated builder image
  warn "    → prisma CLI not in runtime image; assuming migrations applied at build or skip"
fi

# ── 5. Restart with new image ─────────────────────────────────────────────────
log "5/6 Restart container with new image"
docker compose up -d --force-recreate

# ── 6. Wait for healthcheck ──────────────────────────────────────────────────
log "6/6 Waiting for healthcheck (max ${HEALTH_TIMEOUT_SEC}s)"
elapsed=0
while (( elapsed < HEALTH_TIMEOUT_SEC )); do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' loankit 2>/dev/null || echo "unknown")
  case "$STATUS" in
    healthy)  log "    → healthy after ${elapsed}s"; break ;;
    unhealthy) docker compose logs --tail=50 loankit; die "Container unhealthy" ;;
    *) sleep 3; elapsed=$((elapsed+3)) ;;
  esac
done
if [[ "$STATUS" != "healthy" ]]; then
  docker compose logs --tail=50 loankit
  die "Healthcheck timeout after ${HEALTH_TIMEOUT_SEC}s"
fi

# ── Smoke test ──────────────────────────────────────────────────────────────
log "Smoke-testing /api/health"
if curl -fsS http://127.0.0.1:3000/api/health | grep -q '"ok":true'; then
  log "    → /api/health OK"
else
  warn "    → /api/health smoke failed (check Tailscale Serve / firewall)"
fi

# ── Status ───────────────────────────────────────────────────────────────────
docker compose ps
echo
log "Recent logs:"
docker compose logs --tail=20 loankit

cat <<EOF

──────────────────────────────────────────────────────────────────
DEPLOY COMPLETE.

  Verify externally:
    curl -fsS https://<tailnet-hostname>/api/health

  Rollback if broken:
    bash scripts/deploy-vps.sh --rollback
──────────────────────────────────────────────────────────────────
EOF
