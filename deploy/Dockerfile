FROM node:22.18.0-alpine

COPY . .

# Runs linting, unit tests, and compiles the release package
RUN npm ci && npm run lint && npm test && npm run build

# Runs example package to test the import and instantiation of release package
WORKDIR /example
RUN npm ci && npm start
