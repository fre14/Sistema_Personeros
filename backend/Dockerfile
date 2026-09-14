FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Run migrations, seed, then start
EXPOSE 3000

# Production: use node directly (PM2 is used on VPS deployments)
CMD ["node", "src/app.js"]
