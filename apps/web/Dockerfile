FROM node:24-bookworm-slim

WORKDIR /app

RUN corepack enable

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_ETH_RPC_URL
ARG NEXT_PUBLIC_BSC_RPC_URL
ARG NEXT_PUBLIC_POLYGON_RPC_URL
ARG NEXT_PUBLIC_ARBITRUM_RPC_URL
ARG NEXT_PUBLIC_OPTIMISM_RPC_URL
ARG NEXT_PUBLIC_BASE_RPC_URL
ARG NEXT_PUBLIC_DEFAULT_SAFETY_MODE
ARG NEXT_PUBLIC_DEFAULT_AUTOLOCK_MINUTES

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_ETH_RPC_URL=${NEXT_PUBLIC_ETH_RPC_URL} \
    NEXT_PUBLIC_BSC_RPC_URL=${NEXT_PUBLIC_BSC_RPC_URL} \
    NEXT_PUBLIC_POLYGON_RPC_URL=${NEXT_PUBLIC_POLYGON_RPC_URL} \
    NEXT_PUBLIC_ARBITRUM_RPC_URL=${NEXT_PUBLIC_ARBITRUM_RPC_URL} \
    NEXT_PUBLIC_OPTIMISM_RPC_URL=${NEXT_PUBLIC_OPTIMISM_RPC_URL} \
    NEXT_PUBLIC_BASE_RPC_URL=${NEXT_PUBLIC_BASE_RPC_URL} \
    NEXT_PUBLIC_DEFAULT_SAFETY_MODE=${NEXT_PUBLIC_DEFAULT_SAFETY_MODE} \
    NEXT_PUBLIC_DEFAULT_AUTOLOCK_MINUTES=${NEXT_PUBLIC_DEFAULT_AUTOLOCK_MINUTES}

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
