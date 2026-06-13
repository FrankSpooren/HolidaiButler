# threema-relay — minimale, dependency-vrije Node-container.
# Pure stdlib (http/https/url) => geen npm install, geen supply-chain surface.
FROM node:22-alpine

# Draai als non-root (node-user bestaat in de base image)
WORKDIR /app
# package.json declareert expliciet type:commonjs zodat de require-based relay
# identiek werkt in-container en in-repo (de repo-root is ESM type:module).
COPY package.json relay.js ./
USER node

EXPOSE 8099
CMD ["node", "relay.js"]
