# ---------- Etapa 1: compilar ----------
FROM node:24-alpine AS build
WORKDIR /app

# Primero solo las dependencias: Docker reutiliza esta capa si package*.json no cambia
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src ./src
RUN npm run build:node

# ---------- Etapa 2: imagen final (solo lo necesario para correr) ----------
FROM node:24-alpine
WORKDIR /app

ENV NODE_ENV=production \
    PORT=8787 \
    DB_PATH=/data/pizzeria.db \
    MIGRATIONS_DIR=/app/migrations

COPY --from=build /app/dist/server.mjs ./server.mjs
COPY migrations ./migrations

# Carpeta de la base SQLite, propiedad del usuario sin privilegios "node"
RUN mkdir -p /data && chown node:node /data
USER node

EXPOSE 8787
CMD ["node", "--disable-warning=ExperimentalWarning", "server.mjs"]