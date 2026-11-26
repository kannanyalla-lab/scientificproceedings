#!/usr/bin/env bash
# One-step setup of the KIMSHEALTH Scientific Proceedings site on a fresh Ubuntu server.
# Run on the server as root (Hostinger: hPanel > VPS > Browser terminal):
#
#   curl -fsSL https://raw.githubusercontent.com/kannanyalla-lab/scientificproceedings/claude/journal-site/deploy/install.sh | bash
#
# It installs Docker, downloads the site to /opt/ksp, asks for the web address and the
# editor login (typed here on the server, never sent anywhere else), and starts everything.
# Running it again later updates the site and keeps all settings and content.
set -euo pipefail

REPO="${KSP_REPO:-https://github.com/kannanyalla-lab/scientificproceedings.git}"
BRANCH="${KSP_BRANCH:-claude/journal-site}"
DIR="${KSP_DIR:-/opt/ksp}"
ENV_FILE="$DIR/deploy/.env"

say()  { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warn() { printf '\n\033[1;33m!!  %s\033[0m\n' "$*"; }
die()  { printf '\n\033[1;31mXX  %s\033[0m\n' "$*"; exit 1; }
ask()  { local v; read -r -p "$1" v </dev/tty; printf '%s' "$v"; }

[ "$(id -u)" -eq 0 ] || die "Please run this as root (type: sudo -i  then run the command again)."
command -v apt-get >/dev/null || die "This script expects Ubuntu or Debian."

say "Installing the basics (git, curl, firewall)..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git curl ca-certificates openssl ufw >/dev/null

if ! command -v docker >/dev/null || ! docker compose version >/dev/null 2>&1; then
  say "Installing Docker (takes a minute or two)..."
  # Docker's own installer first; on very new Ubuntu releases it may not be ready yet,
  # so fall back to Ubuntu's own Docker packages.
  if ! (curl -fsSL https://get.docker.com | sh >/dev/null 2>&1) || ! docker compose version >/dev/null 2>&1; then
    apt-get install -y -qq docker.io >/dev/null
    apt-get install -y -qq docker-compose-v2 >/dev/null 2>&1 || apt-get install -y -qq docker-compose-plugin >/dev/null
  fi
  docker compose version >/dev/null 2>&1 || die "Docker could not be installed. Please send a screenshot of this window."
fi
systemctl enable --now docker >/dev/null 2>&1 || true

say "Downloading the website..."
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" fetch -q origin "$BRANCH"
  git -C "$DIR" checkout -q -B "$BRANCH" FETCH_HEAD
else
  git clone -q --branch "$BRANCH" "$REPO" "$DIR"
fi
cd "$DIR/deploy"

if [ ! -f "$ENV_FILE" ]; then
  say "A few questions (type the answer and press Enter)"
  echo
  DOMAIN=""
  while [ -z "$DOMAIN" ]; do
    DOMAIN=$(ask "Web address for the site, without https:// (for example proceedings.kimshealth.org): ")
    DOMAIN=$(printf '%s' "$DOMAIN" | tr '[:upper:]' '[:lower:]' | sed -E 's#^https?://##; s#/.*$##; s/[[:space:]]//g')
  done

  MYIP=$(curl -4 -fsS https://api.ipify.org 2>/dev/null || true)
  DNSIP=$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk 'NR==1{print $1}' || true)
  if [ -n "$MYIP" ] && [ "$DNSIP" != "$MYIP" ]; then
    warn "$DOMAIN does not point to this server yet (it points to: ${DNSIP:-nothing}; this server is $MYIP)."
    warn "The site will start, and the padlock (HTTPS) will switch on by itself once the DNS record is in place."
  fi

  EMAIL=""
  while [ -z "$EMAIL" ]; do EMAIL=$(ask "Email address for the Editor login: "); done

  while true; do
    read -r -s -p "Choose an Editor password (at least 10 characters; nothing shows while you type): " P1 </dev/tty; echo
    read -r -s -p "Type the same password again: " P2 </dev/tty; echo
    if [ "$P1" != "$P2" ]; then warn "The two passwords are different. Try again."; continue; fi
    if [ "${#P1}" -lt 10 ]; then warn "Too short. Use at least 10 characters."; continue; fi
    case "$P1" in *"'"*) warn "Please don't use the ' character."; continue;; esac
    break
  done

  umask 077
  cat > "$ENV_FILE" <<CONF
# Settings for the live site. Keep this file private.
SITE_DOMAIN='$DOMAIN'
# More addresses for the same site, separated by spaces (for example www.$DOMAIN)
EXTRA_DOMAINS=''
ADMIN_EMAIL='$EMAIL'
ADMIN_PASSWORD='$P1'
AUTH_SECRET='$(openssl rand -hex 32)'
POSTGRES_PASSWORD='$(openssl rand -hex 24)'
# Optional: Claude API key for Editor panel > Import edition
ANTHROPIC_API_KEY=''
BACKUP_KEEP_DAYS=14
CONF
  chmod 600 "$ENV_FILE"
  unset P1 P2
else
  say "Keeping your existing settings ($ENV_FILE)."
fi

if ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow OpenSSH >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443 >/dev/null
fi

say "Building and starting the site (the first time takes about 5 minutes)..."
docker compose up -d --build --remove-orphans
docker image prune -f >/dev/null 2>&1 || true

say "Waiting for the site to answer..."
ok=""
for _ in $(seq 1 60); do
  if docker compose exec -T web node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then ok=1; break; fi
  sleep 5
done

DOMAIN=$(sed -n "s/^SITE_DOMAIN='\(.*\)'$/\1/p" "$ENV_FILE")
if [ -n "$ok" ]; then
  say "Done! The site is running."
  echo "   Open:        https://$DOMAIN"
  echo "   Editor panel: https://$DOMAIN/admin"
  echo "   Backups are saved every night in $DIR/deploy/backups"
  echo "   To update later, run this same command again."
else
  warn "The site did not answer yet. Show the last messages with:"
  echo "   cd $DIR/deploy && docker compose logs --tail 80 web"
fi
