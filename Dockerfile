FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build the React app and TypeScript server
RUN npm run build

# Runtime stage
FROM node:18-alpine

WORKDIR /app

# Copy package.json for runtime dependencies
COPY package.json package-lock.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built frontend from builder
COPY --from=builder /app/dist ./dist

# Copy compiled server from builder
COPY --from=builder /app/server-dist ./server-dist

# Expose port
EXPOSE 3000

# Start the Express server
CMD ["node", "server-dist/server.js"]
