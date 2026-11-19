# KIMSHEALTH Scientific Proceedings

Website and editorial back office for *KIMSHEALTH Scientific Proceedings*, a clinical and scientific research journal.

Built with **Next.js 16** (App Router, React 19), **PostgreSQL** and **Drizzle ORM**.

## What's included

**Public site**

| Page | URL |
| --- | --- |
| Home: current issue, highlights by article type, learning features, latest pharma updates | `/` |
| Current issue (redirects to the issue marked current) | `/issue/current` |
| Issue table of contents, grouped by article type with a jump menu | `/issue/[slug]` |
| Archive of every issue, grouped by year | `/issues` |
| Article: structured abstract, keywords, full text with figures, references, affiliations, corresponding author, PDF, print, share, copy-ready citation, previous/next in issue, view count | `/article/[slug]` |
| Search by title, author, keyword or abstract, filterable by article type | `/search` |
| Pharma Updates list and detail | `/pharma-updates` |
| Radiology Spotters: image cases with zoom and reveal-answer, per issue | `/radiology-spotters` |
| Scramble: interactive word puzzle with answer checking and score, per issue | `/scramble` |
| About and author guidelines | `/about` |
| Manuscript submission form with file upload | `/submit` |

SEO: per-page titles and descriptions, Open Graph tags, Google Scholar `citation_*` meta tags, schema.org `ScholarlyArticle` JSON-LD, `sitemap.xml` and `robots.txt`. Print uses a dedicated print stylesheet (`?mode=print` opens the print dialog).

**Editor panel** at `/admin` (sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`)

- Dashboard with counts, total article views, most-read articles and latest submissions
- Create, edit and delete issues, articles, pharma updates, spotter cases and scramble words
- Upload PDFs and images (or paste a URL); mark the current issue; feature articles on the home page; draft/published status
- Review manuscript submissions, download files and track status with private notes

Citations are computed from each article's real issue, volume and pages, so they're always correct.

## Run it on your computer

You only need [Node.js](https://nodejs.org) (the LTS version). No database to install.

```bash
npm install
npm run dev
```

Then open http://localhost:3000. The first run creates `.env`, starts a built-in database (stored in `.data/db`) and loads the March 2026 issue as sample content. The editor panel is at http://localhost:3000/admin (sign in with `editor@example.com` / `admin123`; change these in `.env`).

**Windows shortcut:** download [`Website.bat`](Website.bat), put it on your Desktop and double-click it. The first time, it downloads the site to `%USERPROFILE%\KIMSHEALTH-Proceedings`, installs it and opens it in your browser. After that it starts the site, or (option 2) updates it to the latest version from GitHub first. Your settings, database and uploads are kept when updating.

To use your own Postgres instead, set `DATABASE_URL` in `.env`. `npm run dev` then creates the tables and sample content there.

## Environment variables

| Name | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. Leave unset locally to use the built-in database |
| `NEXT_PUBLIC_SITE_URL` | Public URL of the site, used in share links, the sitemap and citation tags |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Editor panel sign-in |
| `AUTH_SECRET` | Long random string that signs editor sessions (`openssl rand -base64 32`) |
| `UPLOAD_DIR` | Folder for uploaded PDFs, images and manuscripts (default `./uploads`) |
| `BLOB_READ_WRITE_TOKEN` | When set (e.g. by adding a Vercel Blob store), uploads go to Vercel Blob instead of disk |

## Deploying

Any Node host with Postgres works (a VPS, Render, Railway, Fly.io, or your own server):

```bash
npm ci
npm run build
npm start      # creates/updates tables and loads sample content if empty, then serves
```

Set `DATABASE_URL` to a real Postgres in production. Uploaded files are written to `UPLOAD_DIR`, so use a host with a persistent disk and back that folder up.

**Vercel:** import the repo, add a Neon Postgres database and a Blob store from the project's Storage tab (they set `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN`), add `ADMIN_EMAIL`, `ADMIN_PASSWORD` and `AUTH_SECRET`, then redeploy. The `vercel-build` script sets up the database during the build. Uploads on Vercel are limited to about 4.5 MB per file.

Serve the site over HTTPS in production: the editor session cookie is marked `Secure`.

## Project layout

```
src/app/(site)/      public pages
src/app/admin/       editor panel, sign-in and server actions
src/app/api/         submission endpoint
src/app/files/       serves uploaded files (manuscripts are editor-only)
src/db/schema.ts     database tables
src/lib/             queries, formatting, auth, storage, admin field config
scripts/seed.ts      sample content loader
drizzle/             SQL migrations
```

To change the schema, edit `src/db/schema.ts` and run `npx drizzle-kit generate`. The new migration is applied the next time the site starts.

## Sample content

The first run loads Volume 12, Issue 01 (March 2026) from the current site: 15 articles, 6 pharma updates, 4 radiology spotter cases and 20 scramble words. The pediatric migraine article includes the full text; the rest have metadata and PDFs, and their abstracts and full text can be added from the editor panel. Images and PDFs point at the existing site's uploads until they're re-uploaded.
