import { Hono } from 'hono'
import { MAX_INGREDIENTES } from './domain/pricing'
import type { MenuRepository } from './data/menu-repository'

// Variables y recursos que Cloudflare le pasa al Worker (vienen de wrangler.jsonc)
export type Bindings = {
  ENVIRONMENT: string
  VERSION: string
  DB: D1Database
}

// De dónde saca la app sus datos (D1 en el Worker, falsos en las pruebas)
export type Repositories = {
  menu: MenuRepository
}

export function createApp(getRepositories: (env: Bindings) => Repositories) {
  const app = new Hono<{ Bindings: Bindings }>()

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

  return app
}