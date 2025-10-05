# ===========================
# Base image for all stages - Alpine for small size
# ===========================
FROM node:20.17.0-alpine AS base
WORKDIR /app

# Set npm configuration for faster installs
ENV NPM_CONFIG_FUND=false \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    NPM_CONFIG_CACHE=/tmp/.npm \
    NODE_ENV=development

RUN mkdir -p /app/frontend /app/backend

# ===========================
# Install frontend dependencies
# ===========================
FROM base AS frontend-deps
WORKDIR /app/frontend
COPY frontend/package*.json ./
# Use repo .npmrc to force public registry and disable auth
COPY .npmrc /app/.npmrc
ENV NPM_CONFIG_USERCONFIG=/app/.npmrc \
    NPM_CONFIG_REGISTRY=https://registry.npmjs.org/ \
    NPM_CONFIG_ALWAYS_AUTH=false \
    NPM_TOKEN= \
    NODE_AUTH_TOKEN=
RUN rm -f /root/.npmrc /home/node/.npmrc || true \
  && (npm ci --prefer-offline --no-fund --no-audit --userconfig=/app/.npmrc --registry=https://registry.npmjs.org/ \
      || (rm -f package-lock.json && npm install --prefer-offline --no-fund --no-audit --userconfig=/app/.npmrc --registry=https://registry.npmjs.org/))

# ===========================
# Build frontend
# ===========================
FROM frontend-deps AS frontend-builder
WORKDIR /app/frontend
# Copy entire frontend source (excluding node_modules by default Docker behavior)
COPY frontend/ .
# Copy root .env file for build-time environment variables
COPY .env.production /app/.env
RUN rm -rf dist && npm run build

# ===========================
# Install backend dependencies
# ===========================
FROM base AS backend-deps
WORKDIR /app/backend
COPY backend/package*.json ./
# Use repo .npmrc to force public registry and disable auth
COPY .npmrc /app/.npmrc
ENV NPM_CONFIG_USERCONFIG=/app/.npmrc \
    NPM_CONFIG_REGISTRY=https://registry.npmjs.org/ \
    NPM_CONFIG_ALWAYS_AUTH=false \
    NPM_TOKEN= \
    NODE_AUTH_TOKEN=
RUN rm -f /root/.npmrc /home/node/.npmrc || true \
  && (npm ci --prefer-offline --no-fund --no-audit --userconfig=/app/.npmrc --registry=https://registry.npmjs.org/ \
      || (rm -f package-lock.json && npm install --prefer-offline --no-fund --no-audit --userconfig=/app/.npmrc --registry=https://registry.npmjs.org/))

# ===========================
# Build backend (TypeScript -> JavaScript)
# ===========================
FROM backend-deps AS backend-builder
WORKDIR /app/backend

# Copy source code first to break cache when source changes
COPY backend/src ./src
COPY backend/tsconfig.json ./
COPY backend/eslint.config.js ./

# Clean dist directory and build
RUN rm -rf dist && npm run build

# Now prune dev dependencies for the final stage
RUN npm prune --production

# ===========================
# Production Image - Alpine
# ===========================
FROM node:20.17.0-alpine AS production
WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy compiled files and dependencies directly
COPY --from=backend-deps --chown=node:node /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder --chown=node:node /app/backend/dist ./backend/dist
COPY --from=frontend-builder --chown=node:node /app/frontend/dist ./frontend/dist

# Copy environment file
COPY .env.production /app/.env

# Create non-root user
RUN chown -R node:node /app
USER node

# Set working directory for backend
WORKDIR /app/backend

# Accept build argument for backend port
ARG BACKEND_PORT=3002
ENV PORT=${BACKEND_PORT}

# Expose backend port
EXPOSE ${BACKEND_PORT}

# Add Node.js optimization flags for smaller memory
ENV NODE_OPTIONS="--max-old-space-size=192 --no-warnings"

# Health check (adjust endpoint as needed)
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:${BACKEND_PORT}/api/health || exit 1

# Start the backend app with optimization flags
CMD ["node", "--enable-source-maps", "--max-old-space-size=192", "dist/index.js"]
