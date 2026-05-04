#!/usr/bin/env bash
# setup-caddy.sh — Install Caddy as TLS reverse proxy.
#
# Two modes:
#   1) PUBLIC  — Let's Encrypt cert via Cloudflare DNS-01 challenge
#                Required env: DOMAIN, CLOUDFLARE_API_TOKEN, ACME_EMAIL
#   2) INTERNAL — Self-signed cert (offline-server scenario)
#                Used when DOMAIN is empty; falls back to Tailscale hostname
#
# Idempotent — safe to re-run.
#
# Usage examples:
#   sudo DOMAIN=loankit.dev CLOUDFLARE_API_TOKEN=cfut_xxx ACME_EMAIL=you@example.com \
#        bash scripts/setup-caddy.sh
#
#   sudo bash scripts/setup-caddy.sh   # internal cert mode (offline)

set -euo pipefail

if [[ "${EUID:-0}" -ne 0 ]]; then
  echo "[err] Must be run as root (use sudo)" >&2
  exit 1
fi

DOMAIN="${DOMAIN:-}"
CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-}"
ACME_EMAIL="${ACME_EMAIL:-}"
TS_HOSTNAME="${TS_HOSTNAME:-}"

# ── Decide mode ───────────────────────────────────────────────────────────────
if [[ -n "$DOMAIN" && -n "$CLOUDFLARE_API_TOKEN" ]]; then
  MODE="public"
  [[ -n "$ACME_EMAIL" ]] || { echo "[err] ACME_EMAIL required in public mode"; exit 1; }
  PRIMARY_HOST="$DOMAIN"
  echo "[setup-caddy] Mode: PUBLIC (Let's Encrypt + Cloudflare DNS-01)"
  echo "[setup-caddy] Domain: $DOMAIN"
else
  MODE="internal"
  if [[ -z "$TS_HOSTNAME" ]]; then
    TS_HOSTNAME=$(tailscale status --json 2>/dev/null \
      | python3 -c 'import sys,json; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))' \
      2>/dev/null || true)
  fi
  [[ -n "$TS_HOSTNAME" ]] || { echo "[err] Cannot detect Tailscale hostname"; exit 1; }
  PRIMARY_HOST="$TS_HOSTNAME"
  echo "[setup-caddy] Mode: INTERNAL (self-signed cert)"
  echo "[setup-caddy] Tailscale hostname: $TS_HOSTNAME"
fi

# ── Install Caddy (idempotent) ────────────────────────────────────────────────
if ! command -v caddy >/dev/null 2>&1; then
  echo "[setup-caddy] Installing Caddy from official repo"
  apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt update
  apt install -y caddy
else
  echo "[setup-caddy] Caddy already installed: $(caddy version | head -1)"
fi

# ── Install Cloudflare DNS plugin (public mode only) ──────────────────────────
if [[ "$MODE" == "public" ]]; then
  if ! caddy list-modules 2>/dev/null | grep -q 'dns.providers.cloudflare'; then
    echo "[setup-caddy] Installing caddy-dns/cloudflare module"
    caddy add-package github.com/caddy-dns/cloudflare
  else
    echo "[setup-caddy] Cloudflare DNS module already installed"
  fi
fi

# ── Write env file for systemd (public mode only) ─────────────────────────────
ENV_FILE=/etc/caddy/caddy.env
if [[ "$MODE" == "public" ]]; then
  echo "[setup-caddy] Writing $ENV_FILE (chmod 600)"
  cat > "$ENV_FILE" <<EOF
CLOUDFLARE_API_TOKEN=$CLOUDFLARE_API_TOKEN
EOF
  chmod 600 "$ENV_FILE"
  chown root:caddy "$ENV_FILE" 2>/dev/null || chown root:root "$ENV_FILE"

  # Systemd drop-in to load env file
  mkdir -p /etc/systemd/system/caddy.service.d
  cat > /etc/systemd/system/caddy.service.d/override.conf <<EOF
[Service]
EnvironmentFile=$ENV_FILE
EOF
  systemctl daemon-reload
fi

# ── Write Caddyfile ───────────────────────────────────────────────────────────
CADDYFILE=/etc/caddy/Caddyfile
echo "[setup-caddy] Writing $CADDYFILE"

if [[ "$MODE" == "public" ]]; then
  cat > "$CADDYFILE" <<EOF
# Managed by scripts/setup-caddy.sh — do not edit by hand
{
  email $ACME_EMAIL
  admin localhost:2019
}

# Redirect www → root
www.$DOMAIN {
  redir https://$DOMAIN{uri} permanent
}

$DOMAIN {
  tls {
    dns cloudflare {env.CLOUDFLARE_API_TOKEN}
  }

  request_body {
    max_size 50MB
  }

  reverse_proxy 127.0.0.1:3000 {
    header_up X-Real-IP {remote_host}
    header_up X-Forwarded-Proto https
  }

  log {
    output file /var/log/caddy/access.log {
      roll_size 10mb
      roll_keep 5
    }
    format json
  }

  encode zstd gzip
}
EOF
else
  cat > "$CADDYFILE" <<EOF
# Managed by scripts/setup-caddy.sh — do not edit by hand
{
  auto_https disable_redirects
  admin localhost:2019
}

$TS_HOSTNAME:443 {
  tls internal

  request_body {
    max_size 50MB
  }

  reverse_proxy 127.0.0.1:3000 {
    header_up X-Real-IP {remote_host}
    header_up X-Forwarded-Proto https
  }

  log {
    output file /var/log/caddy/access.log {
      roll_size 10mb
      roll_keep 5
    }
    format json
  }

  encode zstd gzip
}
EOF
fi

# Log dir — must be owned by caddy user
mkdir -p /var/log/caddy
if id caddy >/dev/null 2>&1; then
  chown -R caddy:caddy /var/log/caddy
  chmod 755 /var/log/caddy
else
  echo "[err] user 'caddy' not found — apt install must have failed" >&2
  exit 1
fi

# ── Validate + reload ─────────────────────────────────────────────────────────
echo "[setup-caddy] Validating Caddyfile"
caddy validate --config "$CADDYFILE" --adapter caddyfile

echo "[setup-caddy] Restarting caddy.service"
systemctl enable caddy
systemctl restart caddy
sleep 3
systemctl is-active --quiet caddy || { echo "[err] caddy not active"; journalctl -u caddy --no-pager -n 30; exit 1; }

# ── UFW rules ─────────────────────────────────────────────────────────────────
echo "[setup-caddy] UFW: allow 443 (and 80 fallback)"
if [[ "$MODE" == "public" ]]; then
  # Public mode: allow from anywhere (Cloudflare DNS-01 doesn't need port 80, but allow for fallback)
  ufw allow 443/tcp || true
  ufw allow 80/tcp || true
else
  # Internal mode: only via tailscale0
  ufw allow in on tailscale0 to any port 443 proto tcp || true
  ufw allow in on tailscale0 to any port 80 proto tcp || true
fi

# ── Smoke test ────────────────────────────────────────────────────────────────
echo "[setup-caddy] Smoke test"
sleep 2
if [[ "$MODE" == "public" ]]; then
  # Public mode: cert should be valid, no -k needed
  if curl -fsS "https://$PRIMARY_HOST/api/health" | grep -q '"ok":true'; then
    echo "[setup-caddy]     → /api/health OK (Let's Encrypt cert valid)"
  else
    echo "[warn] smoke test failed — cert may still be provisioning, check: journalctl -u caddy -f"
  fi
else
  if curl -fsSk "https://$PRIMARY_HOST/api/health" | grep -q '"ok":true'; then
    echo "[setup-caddy]     → /api/health OK over HTTPS (self-signed)"
  else
    echo "[warn] smoke test failed — check journalctl -u caddy"
  fi
fi

# ── Output guidance ───────────────────────────────────────────────────────────
if [[ "$MODE" == "public" ]]; then
  cat <<EOF

──────────────────────────────────────────────────────────────────
CADDY READY at: https://$DOMAIN

✓ Let's Encrypt cert provisioned via Cloudflare DNS-01
✓ Browser will show valid cert (no warning)
✓ www.$DOMAIN redirects to $DOMAIN

Next steps:
  1. Update .env.production: BETTER_AUTH_URL=https://$DOMAIN
  2. Restart app: docker compose restart loankit
  3. Test: open https://$DOMAIN in browser
──────────────────────────────────────────────────────────────────
EOF
else
  ROOT_CA=$(find /var/lib/caddy/.local/share/caddy/pki/authorities/local -name 'root.crt' 2>/dev/null | head -1)
  [[ -z "$ROOT_CA" ]] && ROOT_CA=$(find /root/.local/share/caddy/pki/authorities/local -name 'root.crt' 2>/dev/null | head -1)
  cat <<EOF

──────────────────────────────────────────────────────────────────
CADDY READY at: https://$TS_HOSTNAME (self-signed)

To remove "Not secure" warning:
  1. Copy root CA: scp quan@$TS_HOSTNAME:$ROOT_CA ./caddy-root.crt
  2. Windows: caddy-root.crt → Install → "Trusted Root Certification Authorities"
──────────────────────────────────────────────────────────────────
EOF
fi
