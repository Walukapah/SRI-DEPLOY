# Multi-stage build for production

# Stage 1: Build the frontend
FROM node:16-alpine AS frontend-builder
WORKDIR /app
COPY client/package.json client/package-lock.json ./
RUN npm install
COPY client .
RUN npm run build

# Stage 2: Build the backend
FROM node:16-alpine AS backend-builder
WORKDIR /app
COPY server/package.json server/package-lock.json ./
RUN npm install --production
COPY server .

# Stage 3: Create the final image
FROM node:16-alpine
WORKDIR /app

# Copy built frontend
COPY --from=frontend-builder /app/.next ./.next
COPY --from=frontend-builder /app/public ./public
COPY --from=frontend-builder /app/package.json ./

# Copy backend
COPY --from=backend-builder /app ./server

# Install production dependencies
RUN npm install --production

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV SERVER_PORT=3001

# Expose ports
EXPOSE 3000 3001

# Start command using PM2
RUN npm install -g pm2
COPY ecosystem.config.js .
CMD ["pm2-runtime", "ecosystem.config.js"]
