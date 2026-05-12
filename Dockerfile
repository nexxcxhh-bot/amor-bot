FROM node:22-slim

RUN npm install -g pnpm@10

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @workspace/api-server run build

CMD ["node", "artifacts/api-server/dist/index.mjs"]
