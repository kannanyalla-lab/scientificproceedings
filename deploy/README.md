# Running the live site on the Hostinger VPS

The live site runs on the Hostinger VPS **srv2201118** (Ubuntu 26.04) at
**https://proceedings.kimstvm.tech**. Everything lives in `/opt/ksp` on the server.

What runs there (all started by Docker, and restarted automatically after a reboot):

| Part   | What it does |
|--------|--------------|
| web    | The website itself |
| db     | The database (Postgres) |
| caddy  | Answers on the internet and keeps the HTTPS padlock certificate renewed |
| backup | Saves the database and uploaded files every night at about 02:30 (server time) into `/opt/ksp/deploy/backups`, keeping 14 days |

## Opening the server's terminal

1. Go to <https://hpanel.hostinger.com> and sign in.
2. Click **VPS** on the left, then **Manage** next to *srv2201118.hstgr.cloud*.
3. In the *Connect to your VPS* box, click **Web console**. A black window opens; you are signed in as `root`.

To paste a command into that window: copy it here, then right-click inside the black window and choose **Paste** (or press Ctrl+Shift+V), then press **Enter**.

## Updating the site to the newest version

Open the terminal (above) and paste:

```
curl -fsSL https://raw.githubusercontent.com/kannanyalla-lab/scientificproceedings/claude/journal-site/deploy/install.sh | bash
```

It downloads the latest version, keeps all your settings and content, and restarts the site.
It takes about 5 minutes. The site is briefly unavailable (about a minute) at the end.

## Making a backup right now

```
cd /opt/ksp/deploy && docker compose exec backup sh /backup.sh && ls -lh backups
```

To keep a copy off the server, download the newest `db_...dump` and `files_...tar.gz` from
`/opt/ksp/deploy/backups` (for example with WinSCP), or turn on Hostinger's weekly snapshots
under **VPS > Backups & Monitoring**.

## Restoring a backup (only if something went badly wrong)

Replace the dates with the backup you want:

```
cd /opt/ksp/deploy
docker compose stop web
docker compose exec -T db pg_restore -U ksp -d ksp --clean --if-exists < backups/db_2026-12-01_0230.dump
docker compose run --rm --no-deps -v "$PWD/backups:/backups" --entrypoint sh web -c "cd / && tar -xzf /backups/files_2026-12-01_0230.tar.gz --transform 's#^appdata#app/.data#;s#^uploads#app/uploads#'"
docker compose start web
```

## Changing settings (Editor login, Claude API key, extra addresses)

Settings are in `/opt/ksp/deploy/.env` (private; only root can read it). Edit it with:

```
nano /opt/ksp/deploy/.env
```

Change the value between the quotes, press Ctrl+O, Enter, Ctrl+X, then apply with:

```
cd /opt/ksp/deploy && docker compose up -d
```

## Seeing what's wrong

```
cd /opt/ksp/deploy && docker compose ps && docker compose logs --tail 80 web
```
