FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run typecheck && npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN useradd --system --uid 1001 --create-home sixcore
COPY --from=builder --chown=sixcore:sixcore /app/.next/standalone ./
COPY --from=builder --chown=sixcore:sixcore /app/.next/static ./.next/static
COPY --from=builder --chown=sixcore:sixcore /app/public ./public
COPY --from=builder --chown=sixcore:sixcore /app/scripts ./scripts
COPY --from=builder --chown=sixcore:sixcore /app/migrations ./migrations
COPY --from=deps --chown=sixcore:sixcore /app/node_modules ./node_modules
USER sixcore
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "scripts/start.mjs"]
