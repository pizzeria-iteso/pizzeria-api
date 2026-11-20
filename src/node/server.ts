import { serve } from '@hono/node-server'
import { createApp, type Bindings } from '../app'
import { abrirBaseDeDatos } from './database'
import { SqliteMenuRepository } from './sqlite-menu-repository'
import { SqliteOrderRepository } from './sqlite-order-repository'

// Configuración por variables de entorno (en Docker vienen del Dockerfile y de compose.yaml)
const puerto = Number(process.env.PORT ?? 8787)
const rutaBase = process.env.DB_PATH ?? 'pizzeria.db'
const carpetaMigraciones = process.env.MIGRATIONS_DIR ?? 'migrations'

const env = {
  ENVIRONMENT: process.env.ENVIRONMENT ?? 'node',
  VERSION: process.env.VERSION ?? 'local',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173',
} as Bindings // En Node no hay D1: los repositorios usan SQLite

const { db, aplicadas } = abrirBaseDeDatos(rutaBase, carpetaMigraciones)
for (const migracion of aplicadas) console.log(`Migración aplicada: ${migracion}`)

// La misma app de Hono que corre en Cloudflare, con repositorios de SQLite
const repositorios = {
  menu: new SqliteMenuRepository(db),
  orders: new SqliteOrderRepository(db),
}
const app = createApp(() => repositorios)

const servidor = serve({ fetch: (request) => app.fetch(request, env), port: puerto, hostname: '0.0.0.0' }, (info) => {
  console.log(`API de la pizzería (${env.ENVIRONMENT}, versión ${env.VERSION}) en http://localhost:${info.port}`)
})

// Al detener el contenedor (docker stop / Ctrl+C) se cierra todo de forma ordenada
function apagar() {
  servidor.close()
  db.close()
  process.exit(0)
}
process.on('SIGTERM', apagar)
process.on('SIGINT', apagar)