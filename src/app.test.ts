import { describe, it, expect } from 'vitest'
import { createApp, type Bindings } from './app'
import type { MenuRepository } from './data/menu-repository'
import type { Menu } from './domain/pricing'

const menuDePrueba: Menu = {
  sizes: [{ id: 'chica', name: 'Chica', priceCents: 12900 }],
  crusts: [{ id: 'delgada', name: 'Delgada', priceCents: 0 }],
  toppings: [{ id: 'pepperoni', name: 'Pepperoni', priceCents: 2500 }],
}

// Repositorio falso: regresa el menú de prueba sin usar D1
const repoFalso: MenuRepository = {
  getMenu: async () => menuDePrueba,
}

const app = createApp(() => ({ menu: repoFalso }))
const env = { ENVIRONMENT: 'test', VERSION: '1.2.3' } as Bindings

describe('GET /menu', () => {
  it('responde 200 con moneda, límite de ingredientes y el menú', async () => {
    const res = await app.request('/menu', {}, env)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      currency: 'MXN',
      maxToppings: 5,
      sizes: menuDePrueba.sizes,
      crusts: menuDePrueba.crusts,
      toppings: menuDePrueba.toppings,
    })
  })
})