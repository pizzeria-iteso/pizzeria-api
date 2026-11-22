import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { MAX_INGREDIENTES, PizzaValidationError, priceOrder, type PizzaRequest } from './domain/pricing'
import type { MenuRepository } from './data/menu-repository'
import type { OrderRepository } from './data/order-repository'

// Variables y recursos que Cloudflare le pasa al Worker (vienen de wrangler.jsonc y de los secretos)
export type Bindings = {
  ENVIRONMENT: string
  VERSION: string
  ALLOWED_ORIGINS: string
  SENTRY_DSN?: string
  DB: D1Database
}

// De dónde saca la app sus datos (D1 en el Worker, falsos en las pruebas)
export type Repositories = {
  menu: MenuRepository
  orders: OrderRepository
}

export type App = Hono<{ Bindings: Bindings }>

// Ganchos opcionales de observabilidad. En el Worker se conectan a Sentry;
// en Docker (Node) y en las pruebas no se pasan, y la app funciona igual.
export type Observabilidad = {
  // Se llama apenas se crea la app, antes de CORS y de las rutas
  instrumentar?: (app: App) => void
  // Errores controlados (400): Sentry no captura solo los 4xx
  errorControlado?: (error: PizzaValidationError) => void
  // Cada pedido creado, para tener un mensaje reconocible en Sentry
  pedidoCreado?: (pedido: { id: string; totalCents: number; pizzas: number }) => void
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Revisa la forma del JSON antes de calcular el precio
function readPizzas(body: unknown): PizzaRequest[] {
  if (!isObject(body) || !Array.isArray(body.pizzas)) {
    throw new PizzaValidationError('PEDIDO_INVALIDO', 'Se esperaba un JSON con un arreglo "pizzas"')
  }

  for (const pizza of body.pizzas) {
    if (!isObject(pizza) || (pizza.toppingIds !== undefined && !Array.isArray(pizza.toppingIds))) {
      throw new PizzaValidationError(
        'PIZZA_INVALIDA',
        'Cada pizza debe ser un objeto y "toppingIds" debe ser un arreglo'
      )
    }
  }

  return body.pizzas as PizzaRequest[]
}

// Orígenes (páginas web) que pueden llamar a la API desde el navegador.
// Vienen de wrangler.jsonc, separados por comas.
function allowedOrigins(env: Bindings): string[] {
  return (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
}

export function createApp(
  getRepositories: (env: Bindings) => Repositories,
  observabilidad: Observabilidad = {}
) {
  const app: App = new Hono<{ Bindings: Bindings }>()

  // Sentry (u otra herramienta) se conecta antes que todo lo demás
  observabilidad.instrumentar?.(app)

  // CORS: solo los orígenes de la lista reciben permiso del navegador
  app.use(
    '*',
    cors({
      origin: (origin, c) => (allowedOrigins(c.env).includes(origin) ? origin : null),
    })
  )

  // Manejo central de errores
  app.onError((err, c) => {
    if (err instanceof PizzaValidationError) {
      observabilidad.errorControlado?.(err)
      return c.json({ error: { code: err.code, message: err.message } }, 400)
    }
    // Los errores inesperados (500) los captura Sentry automáticamente
    console.error(err)
    return c.json({ error: { code: 'ERROR_INTERNO', message: 'Ocurrió un error inesperado' } }, 500)
  })

  app.get('/health', (c) =>
    c.json({
      status: 'ok',
      version: c.env.VERSION,
      environment: c.env.ENVIRONMENT,
    })
  )

  app.get('/menu', async (c) => {
    const { menu } = getRepositories(c.env)
    const data = await menu.getMenu()

    return c.json({
      currency: 'MXN',
      maxToppings: MAX_INGREDIENTES,
      ...data,
    })
  })

  app.post('/orders', async (c) => {
    const body = await c.req.json().catch(() => null)
    const pizzas = readPizzas(body)

    const { menu, orders } = getRepositories(c.env)

    // El total se calcula aquí con los precios de la base, nunca con lo que mande el cliente
    const priced = priceOrder(await menu.getMenu(), pizzas)

    const id = crypto.randomUUID()
    await orders.save(id, priced)
    observabilidad.pedidoCreado?.({ id, totalCents: priced.totalCents, pizzas: priced.items.length })

    const order = await orders.findById(id)
    return c.json(order, 201)
  })

  app.get('/orders/:id', async (c) => {
    const { orders } = getRepositories(c.env)
    const order = await orders.findById(c.req.param('id'))

    if (!order) {
      return c.json({ error: { code: 'PEDIDO_NO_ENCONTRADO', message: 'No existe un pedido con ese id' } }, 404)
    }

    return c.json(order)
  })

  return app
}