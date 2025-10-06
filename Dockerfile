FROM oven/bun:latest
WORKDIR /app

COPY bun.lock package.json ./
RUN bun install --ci

COPY . .

ENV NODE_ENV=production
EXPOSE 8080
CMD ["bun", "run", "start"]
