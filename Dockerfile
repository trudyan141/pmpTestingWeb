# Use the official Microsoft Playwright image as a base
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files for workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install dependencies (ignoring scripts initially to avoid prisma generation issues)
RUN pnpm install --frozen-lockfile

# Copy the rest of the code
COPY . .

# Generate Prisma Client
RUN cd apps/api && pnpm prisma generate

# Build the shared package first
RUN pnpm build --filter=@repo/shared

# Build the API
RUN pnpm build --filter=api

# Expose the API port
EXPOSE 3001

# Set production environment
ENV NODE_ENV=production

# Start command
CMD ["pnpm", "--filter", "api", "run", "start:prod"]
