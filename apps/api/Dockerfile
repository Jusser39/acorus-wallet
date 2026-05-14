FROM node:24-bookworm-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV="production"
ENV PRISMA_SKIP_POSTINSTALL_GENERATE="true"

WORKDIR /app

RUN corepack enable

RUN apt-get update && \
    apt-get install -y --no-install-recommends bash ca-certificates curl openssl && \
    rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/wallet-core/package.json packages/wallet-core/package.json

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @acorus/shared build && \
    pnpm --filter @acorus/wallet-core build && \
    pnpm --filter @acorus/api prisma:generate && \
    pnpm --filter @acorus/api build

COPY scripts/docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
RUN chmod +x /usr/local/bin/api-entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["api-entrypoint.sh"]
CMD ["pnpm", "--filter", "@acorus/api", "start:prod"]
