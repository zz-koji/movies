# Use Node.js 22 as base image
FROM node:22 AS development

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Install dependencies
RUN corepack enable
RUN yarn install

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Production stage
FROM node:22 AS production

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./
COPY yarn.lock ./

# Install only production dependencies
RUN yarn install --production && yarn cache clean

# Copy built application from development stage
COPY --from=development /usr/src/app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Change ownership of the application directory
RUN chown -R nestjs:nodejs /usr/src/app
USER nestjs

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"]
