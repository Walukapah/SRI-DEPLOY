# Multi-stage build for production

# Stage 1: Build the frontend
FROM node:16-alpine as frontend-builder
WORKDIR /app
COPY client/package.json client/package-lock.json ./client/
RUN npm install --prefix client
COPY client ./client
RUN npm run build --prefix client

# Stage 2: Build the backend
FROM node:16-alpine as backend-builder
WORKDIR /app
COPY server/package.json server/package-lock.json ./server/
RUN npm install --prefix server --production
COPY server ./server

# Stage 3: Create the final image
FROM node:16-alpine
WORKDIR /app

# Copy built frontend
COPY --from=frontend-builder /app/client/.next ./client/.next
COPY --from=frontend-builder /app/client/public ./client/public
COPY --from=frontend-builder /app/client/package.json ./client/

# Copy backend
COPY --from=backend-builder /app/server ./server

# Install production dependencies
RUN npm install --prefix client --production

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV SERVER_PORT=3001

# Expose ports
EXPOSE 3000 3001

# Start command using PM2 for process management
RUN npm install -g pm2
COPY ecosystem.config.js .
CMD ["pm2-runtime", "ecosystem.config.js"]
