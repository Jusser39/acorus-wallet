FROM node:24-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/wallet-core/package.json packages/wallet-core/package.json

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter @acorus/shared build && \
    pnpm --filter @acorus/wallet-core build && \
    pnpm --filter @acorus/web build

EXPOSE 3000

CMD ["pnpm", "--filter", "@acorus/web", "start"]
