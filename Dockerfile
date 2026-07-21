FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy the root package.json and lockfile
COPY package.json package-lock.json ./

# Copy workspace package.jsons to leverage Docker layer caching
# This assumes standard workspaces exist in their respective directories
COPY server/package.json ./server/
COPY webapp/package.json ./webapp/
COPY extension/package.json ./extension/

# Install dependencies (workspaces will automatically link)
RUN npm ci

# Copy the rest of the application code
COPY . .

# Expose the server port
EXPOSE 3001

# Command to start the backend server
CMD ["npm", "run", "server"]
