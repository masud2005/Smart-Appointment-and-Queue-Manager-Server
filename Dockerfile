# Build stage
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy prisma config and schema files
COPY prisma.config.ts ./
COPY prisma ./prisma

ENV DATABASE_URL=postgresql://DUMMY:DUMMY@db:5432/DUMMY-db?schema=public

# Generate Prisma Client
RUN pnpm prisma generate

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Production stage
FROM node:22-alpine AS production

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install

# Copy prisma config and schema files
COPY prisma.config.ts ./
COPY --from=builder /app/prisma ./prisma

# Copy built application
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Run database migrations and start the application
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/src/main.js"]
