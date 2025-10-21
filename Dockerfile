# Unified Dockerfile for Musable (Backend + Frontend)
FROM node:18-alpine AS frontend-builder

# Set working directory for frontend
WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci && npm cache clean --force

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

# Backend builder stage
FROM node:18-alpine AS backend-builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Set working directory for backend
WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./

# Install ALL dependencies (including dev dependencies for build)
RUN npm ci && npm cache clean --force

# Copy backend source
COPY backend/ ./

# Build backend TypeScript
RUN npm run build

# Install production dependencies only for final stage
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:18-alpine

# Install runtime dependencies (ffmpeg for audio processing)
RUN apk add --no-cache \
    ffmpeg \
    curl \
    tzdata

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S musable -u 1001

# Set working directory
WORKDIR /app

# Copy backend build and node_modules
COPY --from=backend-builder --chown=musable:nodejs /app/backend/dist ./dist
COPY --from=backend-builder --chown=musable:nodejs /app/backend/node_modules ./node_modules
COPY --from=backend-builder --chown=musable:nodejs /app/backend/package*.json ./

# Copy frontend build to public directory
COPY --from=frontend-builder --chown=musable:nodejs /app/frontend/build ./public

# Copy entrypoint script
COPY --chown=musable:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Create necessary directories with correct permissions
RUN mkdir -p /app/uploads /app/yt-downloads /app/data /music && \
    chown -R musable:nodejs /app /music

# Switch to non-root user
USER musable

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1

# Start the application with entrypoint script
CMD ["./docker-entrypoint.sh"]
