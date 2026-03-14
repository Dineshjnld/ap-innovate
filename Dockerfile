# ── Stage 1: Build frontend ─────────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: Production image ──────────────────────────────────────────
FROM node:20-slim
WORKDIR /app

# Install PM2 globally
RUN npm i -g pm2

# Copy package files and install production deps only
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy server code
COPY server/ server/
COPY ecosystem.config.cjs ./

# Copy built frontend from builder stage
COPY --from=builder /app/dist dist/

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/api/health').then(r=>{if(!r.ok)throw 1}).catch(()=>process.exit(1))"

# Start with PM2 in cluster mode
CMD ["pm2-runtime", "ecosystem.config.cjs"]
