# Use official Node.js image as the base
FROM node:20-alpine AS cherry-analytics-builder

# Set working directory
WORKDIR /app

# Copy package.json and lock file
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy the rest of the app
COPY . .

# Build the Next.js app
RUN yarn build

# Production image, copy built assets from builder
FROM node:20-alpine AS cherry-analytics
WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN  yarn install --production --frozen-lockfile

# Copy built app and public files
COPY --from=cherry-analytics-builder /app/.next ./.next
COPY --from=cherry-analytics-builder /app/public ./public
COPY --from=cherry-analytics-builder /app/next.config.ts ./next.config.ts
COPY --from=cherry-analytics-builder /app/package.json ./package.json
# Copy .env file for build-time and runtime environment variables
COPY .env .env

# Expose port 3000
EXPOSE 3000

# Start the Next.js app
CMD ["yarn", "start"]
