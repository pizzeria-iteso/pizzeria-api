import { Hono } from 'hono'
import { MAX_INGREDIENTES, PizzaValidationError, priceOrder, type PizzaRequest } from './domain/pricing'
import type { MenuRepository } from './data/menu-repository'
import type { OrderRepository } from './data/order-repository'

// Variables y recursos que Cloudflare le pasa al Worker (vienen de wrangler.jsonc)
export type Bindings = {
  ENVIRONMENT: string
  VERSION: string
  DB: D1Database
}

// De dónde saca la app sus datos (D1 en el Worker, falsos en las pruebas)
export type Repositories = {
  menu: MenuRepository
  orders: OrderRepository
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

export function createApp(getRepositories: (env: Bindings) => Repositories) {
  const app = new Hono<{ Bindings: Bindings }>()

  // Manejo central de errores (aquí se conectará Sentry en el Bloque 7)
  app.onError((err, c) => {
    if (err instanceof PizzaValidationError) {
      return c.json({ error: { code: err.code, message: err.message } }, 400)
    }
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