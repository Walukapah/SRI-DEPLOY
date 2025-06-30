# Multi-stage build for production

# Stage 1: Build the frontend
FROM node:16-alpine as frontend-builder
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm install
COPY client .
RUN npm run build

# Stage 2: Build the backend
FROM node:16-alpine as backend-builder
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm install --production
COPY server .

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
ENV CLIENT_PORT=3000
ENV SERVER_PORT=3001

# Expose ports
EXPOSE 3000 3001

# Start command
CMD ["sh", "-c", "npm start --prefix server & npm start --prefix client"]
