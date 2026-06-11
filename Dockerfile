FROM node:22-bookworm-slim

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates postgresql-client \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@10.15.1 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["pnpm", "start"]
