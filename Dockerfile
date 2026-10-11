FROM node:22-alpine

WORKDIR /app

# Zero external npm dependencies needed!
COPY package.json ./
COPY server.mjs ./
COPY public/ ./public/

ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.mjs"]
