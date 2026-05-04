#!/usr/bin/env bash
# setup-caddy.sh — Install Caddy as TLS reverse proxy with internal (self-signed) cert.
# Mirrors offline server setup: no Let's Encrypt, no Tailscale paid cert.
#
# Idempotent — safe to re-run.
#
# Usage:  sudo bash scripts/setup-caddy.sh
# Env override: TS_HOSTNAME (auto-detected from `tailscale status` if missing)

set -euo pipefail

if [[ "${EUID:-0}" -ne 0 ]]; then
  echo "[err] Must be run as root (use sudo)" >&2
  exit 1
fi

# ── Detect Tailscale hostname ─────────────────────────────────────────────────
TS_HOSTNAME="${TS_HOSTNAME:-}"
if [[ -z "$TS_HOSTNAME" ]]; then
  TS_HOSTNAME=$(tailscale status --json 2>/dev/null \
    | python3 -c 'import sys,json; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))' \
    2>/dev/null || true)
fi
[[ -n "$TS_HOSTNAME" ]] || { echo "[err] Cannot detect Tailscale hostname"; exit 1; }
echo "[setup-caddy] Tailscale hostname: $TS_HOSTNAME"

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

# ── Write Caddyfile ───────────────────────────────────────────────────────────
CADDYFILE=/etc/caddy/Caddyfile
echo "[setup-caddy] Writing $CADDYFILE"
cat > "$CADDYFILE" <<EOF
# Managed by scripts/setup-caddy.sh — do not edit by hand
{
  # No public ACME — internal cert only (matches offline server scenario)
  auto_https disable_redirects
  admin localhost:2019
}

$TS_HOSTNAME:443 {
  tls internal

  # Sane upload limit for DOCX/XLSX import
  request_body {
    max_size 50MB
  }

  # Forward real client IP to Next.js (for rate limit + audit)
  reverse_proxy 127.0.0.1:3000 {
    header_up X-Real-IP {remote_host}
    header_up X-Forwarded-Proto https
  }

  # Caddy access log (rotated by journald)
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

# Log dir — must be owned by caddy user (which only exists AFTER apt install caddy)
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
sleep 2
systemctl is-active --quiet caddy || { echo "[err] caddy not active"; journalctl -u caddy --no-pager -n 30; exit 1; }

# ── UFW rules ─────────────────────────────────────────────────────────────────
echo "[setup-caddy] UFW: allow 443 (and 80 fallback) on tailscale0"
ufw allow in on tailscale0 to any port 443 proto tcp || true
ufw allow in on tailscale0 to any port 80 proto tcp || true

# ── Smoke test ────────────────────────────────────────────────────────────────
echo "[setup-caddy] Smoke test (self-signed cert — using -k)"
sleep 1
if curl -fsSk "https://$TS_HOSTNAME/api/health" | grep -q '"ok":true'; then
  echo "[setup-caddy]     → /api/health OK over HTTPS"
else
  echo "[warn] smoke test failed — check journalctl -u caddy"
fi

# ── Show root CA for dev-machine trust ────────────────────────────────────────
ROOT_CA=$(find /var/lib/caddy/.local/share/caddy/pki/authorities/local -name 'root.crt' 2>/dev/null | head -1)
[[ -z "$ROOT_CA" ]] && ROOT_CA=$(find /root/.local/share/caddy/pki/authorities/local -name 'root.crt' 2>/dev/null | head -1)

cat <<EOF

──────────────────────────────────────────────────────────────────
CADDY READY at: https://$TS_HOSTNAME

To remove "Not secure" warning on dev machine:

  1. Copy root CA from VPS:
     scp quan@$TS_HOSTNAME:$ROOT_CA ./caddy-root.crt

  2. Trust on Windows:
     - Open: caddy-root.crt → Install Certificate
     - Store: "Trusted Root Certification Authorities"

  3. Or use --insecure (dev only):
     curl -k https://$TS_HOSTNAME/api/health

Browser: visit https://$TS_HOSTNAME → click "Advanced" → "Proceed".
──────────────────────────────────────────────────────────────────
EOF
