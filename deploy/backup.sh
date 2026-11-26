#!/bin/sh
# Nightly backup of the database and uploaded files into deploy/backups.
#   sh backup.sh        - make one backup now
#   sh backup.sh loop   - make one every night at about 02:30 server time (used by docker compose)
set -eu
KEEP_DAYS="${KEEP_DAYS:-14}"

backup_once() {
  stamp=$(date +%Y-%m-%d_%H%M)
  mkdir -p /backups
  pg_dump -h db -U ksp -d ksp -Fc -f "/backups/db_$stamp.dump.part" && mv "/backups/db_$stamp.dump.part" "/backups/db_$stamp.dump"
  tar -czf "/backups/files_$stamp.tar.gz.part" -C / uploads appdata && mv "/backups/files_$stamp.tar.gz.part" "/backups/files_$stamp.tar.gz"
  find /backups -name 'db_*' -mtime +"$KEEP_DAYS" -delete
  find /backups -name 'files_*' -mtime +"$KEEP_DAYS" -delete
  find /backups -name '*.part' -mmin +600 -delete
  echo "Backup done: $stamp"
}

if [ "${1:-}" != "loop" ]; then backup_once; exit 0; fi

sleep 60
backup_once || echo "Backup failed, will try again tonight"
while true; do
  now=$(date +%s)
  next=$(date -d "$(date +%Y-%m-%d) 02:30" +%s 2>/dev/null || echo $((now + 86400)))
  [ "$next" -le "$now" ] && next=$((next + 86400))
  sleep $((next - now))
  backup_once || echo "Backup failed, will try again tomorrow"
done
