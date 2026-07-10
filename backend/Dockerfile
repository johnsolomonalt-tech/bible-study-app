# syntax = docker/dockerfile:1

ARG NODE_VERSION=20.20.2
FROM node:${NODE_VERSION}-slim as base

LABEL fly_launch_runtime="Node.js"

# Node.js app lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"
ENV PORT="3001"

# Throw-away build stage to reduce size of final image
FROM base as build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3 openssl sqlite3

# Install node modules
COPY package*.json ./
RUN npm ci --include=dev

# Copy application code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build application
RUN npm run build

# Remove development dependencies
RUN npm prune --omit=dev

# Final stage for app image
FROM base

# Install packages needed for Prisma & SQLite
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y openssl sqlite3 ca-certificates && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Copy built application
COPY --from=build /app/dist /app/dist
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/package.json /app/package.json
COPY --from=build /app/prisma /app/prisma
COPY --from=build /app/start.sh /app/start.sh

# Make start script executable
RUN chmod +x /app/start.sh

EXPOSE 3001

# Start the server by default, this can be overwritten at runtime
CMD [ "/app/start.sh" ]
