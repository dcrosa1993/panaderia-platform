
# --------------------------------------------------
# Base común
# --------------------------------------------------
FROM node:24-bookworm-slim AS base

WORKDIR /workspace

RUN npm install --global pnpm@12.11.2


# --------------------------------------------------
# Dependencias para compilar la aplicación
# --------------------------------------------------
FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN pnpm install --frozen-lockfile


# --------------------------------------------------
# Compilación de NestJS y generación de Prisma
# --------------------------------------------------
FROM deps AS build

COPY . .

# Prisma puede necesitar DATABASE_URL al leer la configuración.
# Usamos una URL ficticia: no se conecta a ninguna base de datos.
RUN DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build_db?schema=public" \
    pnpm --filter ./apps/api exec prisma generate

RUN pnpm build:api


# --------------------------------------------------
# Etapa independiente para aplicar migraciones
# --------------------------------------------------
FROM deps AS migrate

COPY . .

ENV NODE_ENV=production

CMD ["pnpm", "--filter", "./apps/api", "exec", "prisma", "migrate", "deploy"]


# --------------------------------------------------
# Dependencias de producción exclusivamente
# --------------------------------------------------
FROM base AS prod-deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN pnpm install --prod --filter ./apps/api --frozen-lockfile


# --------------------------------------------------
# Imagen final de la API
# --------------------------------------------------
FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production

WORKDIR /workspace

COPY --from=prod-deps /workspace/node_modules ./node_modules
COPY --from=prod-deps /workspace/apps/api/node_modules ./apps/api/node_modules

COPY --from=build /workspace/apps/api/package.json ./apps/api/package.json
COPY --from=build /workspace/apps/api/dist ./apps/api/dist

WORKDIR /workspace/apps/api

EXPOSE 3000

CMD ["node", "dist/main.js"]
