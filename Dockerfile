FROM node:20-slim

WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies (not in production mode to get all deps)
RUN npm install --omit=dev

# Copy the rest of the app
COPY . .

# Set production mode
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "index.js"]