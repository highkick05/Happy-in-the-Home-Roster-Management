FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install native build tools for better-sqlite3
RUN apt-get update && apt-get install -y python3 build-essential && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
# Use ci for repeatable builds and faster installation
RUN npm install

COPY . .
# Build React frontend and Node backend
RUN npm run build
# Prune development dependencies
RUN npm prune --production

# Production Image
FROM node:20-bookworm-slim

WORKDIR /app

# Copy production artifacts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Create necessary persistent directories
RUN mkdir -p /app/data /app/uploads /app/invoices

# Environment Variables
ENV NODE_ENV=production
ENV PORT=3000
# Store SQLite and its WAL files safely in a dedicated directory
ENV DATABASE_PATH=/app/data/database.sqlite 
ENV OSRM_URL=http://osrm:5000

EXPOSE 3000

CMD ["npm", "start"]
