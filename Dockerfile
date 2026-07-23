# Stage 1: Base image with dependencies
FROM node:20-alpine AS base
WORKDIR /app

# Copy package manifests for workspace
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY webapp/package.json ./webapp/
COPY extension/package.json ./extension/

# Install dependencies
RUN npm ci

# Stage 2: Builder (for production deployments later)
FROM base AS builder
COPY . .
RUN npm run build

# Stage 3: Production runner
FROM base AS runner
WORKDIR /app
COPY --from=builder /app ./
ENV NODE_ENV=production
CMD ["npm", "run", "server"]
