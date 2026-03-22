# ---- Build stage ----
FROM node:20-slim AS builder

RUN npm install -g bun

WORKDIR /app

# Copy workspace root files
COPY package.json bun.lock turbo.json tsconfig.base.json ./

# Copy workspace packages
COPY packages/shared/package.json packages/shared/
COPY backend/package.json backend/

# Install all dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY packages/shared/ packages/shared/
COPY backend/ backend/
COPY content/ content/

# Build shared package first, then backend
RUN cd packages/shared && bun run build
RUN cd backend && bun x prisma generate && bun x nest build

# ---- Production stage ----
FROM node:20-slim AS runner

WORKDIR /app

# Copy built output and production deps
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/node_modules ./root_modules
COPY --from=builder /app/backend/prisma ./prisma
COPY --from=builder /app/backend/tsconfig.runtime.json ./tsconfig.runtime.json
COPY --from=builder /app/content ./content

# Prisma needs the schema at runtime for the client
ENV NODE_PATH=/app/root_modules

EXPOSE 3000

CMD ["node", "-r", "tsconfig-paths/register", "dist/main.js"]
