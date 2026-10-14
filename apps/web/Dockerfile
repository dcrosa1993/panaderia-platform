
# --------------------------------------------------
# Construcción de Angular
# --------------------------------------------------
FROM node:24-bookworm-slim AS build

WORKDIR /workspace

RUN npm install --global pnpm@12.11.2

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build:web


# --------------------------------------------------
# Imagen final: archivos estáticos servidos por Nginx
# --------------------------------------------------
FROM nginx:stable-alpine AS runtime

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=build /workspace/apps/web/dist/web/browser/ /usr/share/nginx/html/

EXPOSE 80
