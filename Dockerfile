# Production image for the KIMSHEALTH Scientific Proceedings site.
# Used by deploy/docker-compose.yml on the VPS.
FROM node:22-bookworm-slim

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Full install: the site runs through tsx (scripts/run.ts) and the edition
# importer starts scripts/import-worker.ts as a separate Node process.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Public address of the site. It is baked into the pages at build time.
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

# run.ts creates .env from .env.example when it is missing; on the server all
# settings come from the container's environment instead, so keep it empty.
RUN touch .env && npm run build

ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
EXPOSE 3000
VOLUME ["/app/uploads", "/app/.data"]

# Creates or updates the tables, loads bundled issues, then starts Next.js.
CMD ["npx", "tsx", "scripts/run.ts", "start"]
