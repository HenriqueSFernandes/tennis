# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app

# Only copy production dependencies
COPY package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

VOLUME ["/data"]

ENV PORT=3000
ENV DATA_DIR=/data

EXPOSE 3000

CMD ["node", "dist/index.mjs"]
