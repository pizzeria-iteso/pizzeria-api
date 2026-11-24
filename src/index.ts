import * as Sentry from '@sentry/cloudflare'
import { sentry } from '@sentry/hono/cloudflare'
import { createApp, type Bindings } from './app'
import { D1MenuRepository } from './data/d1-menu-repository'
import { D1OrderRepository } from './data/d1-order-repository'

// Configuración de Sentry por ambiente: el DSN es un secreto del Worker,
// y el ambiente y la versión vienen de wrangler.jsonc y del pipeline (SHA corto).
// Sin DSN (por ejemplo, en local sin .dev.vars), Sentry no envía nada.
function opcionesSentry(env: Bindings) {
  return {
    dsn: env.SENTRY_DSN,
    environment: env.ENVIRONMENT,
    release: env.VERSION,
    tracesSampleRate: 1.0, // todas las peticiones generan traza (poco tráfico, ideal para la demo)
  }
}

// Punto de entrada del Worker: conecta la app con D1 y con Sentry
export default createApp(
  (env) => ({
    menu: new D1MenuRepository(env.DB),
    orders: new D1OrderRepository(env.DB),
  }),
  {
    instrumentar: (app) => {
      app.use(sentry(app, (env) => opcionesSentry(env as Bindings)))
    },
    // El error controlado de la demo: aparece en Sentry como advertencia, con su código
    errorControlado: (error) => {
      Sentry.captureException(error, { level: 'warning', tags: { codigo: error.code } })
    },
    // Mensaje reconocible: todos los pedidos se agrupan en un solo issue "Pedido creado"
    pedidoCreado: (pedido) => {
      Sentry.captureMessage('Pedido creado', {
        level: 'info',
        tags: { pizzas: String(pedido.pizzas) },
        extra: pedido,
      })
    },
  }
)