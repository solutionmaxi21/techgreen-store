# ============================================================
# MaxiStore Admin Panel — Production Dockerfile
# Multi-stage build: Vite React → Nginx static server
# ============================================================

# ---- Stage 1: Build the Vite app ----
FROM node:22.18.0-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (need all deps for build)
RUN npm ci

# Copy source files
COPY index.html ./
COPY vite.config.js ./
COPY eslint.config.js ./
COPY src/ ./src/
COPY public/ ./public/

# Build arguments for API URL at build time
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

# Build the production bundle
RUN npm run build

# ---- Stage 2: Serve with Nginx ----
FROM nginx:alpine AS runner

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Custom nginx config for SPA routing
COPY --from=builder /app/dist-app /usr/share/nginx/html

# Add SPA-aware nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
