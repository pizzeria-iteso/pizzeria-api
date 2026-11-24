import { describe, it, expect } from 'vitest'
import { createApp, type Bindings } from './app'
import type { MenuRepository } from './data/menu-repository'
import type { Order, OrderRepository } from './data/order-repository'
import type { Menu } from './domain/pricing'

const menuDePrueba: Menu = {
  sizes: [{ id: 'chica', name: 'Chica', priceCents: 12900 }],
  crusts: [{ id: 'delgada', name: 'Delgada', priceCents: 0 }],
  toppings: [{ id: 'pepperoni', name: 'Pepperoni', priceCents: 2500 }],
}

// Repositorio falso del menú: regresa el menú de prueba sin usar D1
const repoMenuFalso: MenuRepository = {
  getMenu: async () => menuDePrueba,
}

// Repositorio de pedidos en memoria: guarda en un Map en vez de D1
function crearRepoPedidosEnMemoria(): OrderRepository {
  const pedidos = new Map<string, Order>()
  return {
    async save(id, order) {
      pedidos.set(id, {
        id,
        status: 'recibido',
        totalCents: order.totalCents,
        createdAt: '2026-11-15 12:00:00',
        items: order.items,
      })
    },
    async findById(id) {
      return pedidos.get(id) ?? null
    },
  }
}

const repoPedidos = crearRepoPedidosEnMemoria()
const app = createApp(() => ({ menu: repoMenuFalso, orders: repoPedidos }))
const env = { ENVIRONMENT: 'test', VERSION: '1.2.3' } as Bindings

function crearPedido(body: unknown) {
  return app.request(
    '/orders',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    env
  )
}

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

describe('POST /orders', () => {
  it('crea un pedido válido y calcula el total en el backend', async () => {
    const res = await crearPedido({
      pizzas: [{ sizeId: 'chica', crustId: 'delgada', toppingIds: ['pepperoni'], quantity: 2 }],
    })

    expect(res.status).toBe(201)
    const pedido = await res.json()
    expect(typeof pedido.id).toBe('string')
    expect(pedido.status).toBe('recibido')
    expect(pedido.items[0].unitPriceCents).toBe(15400) // 12900 + 0 + 2500
    expect(pedido.totalCents).toBe(30800) // 15400 x 2
  })

  it('ignora el precio que manda el cliente', async () => {
    const res = await crearPedido({
      totalCents: 1,
      pizzas: [{ sizeId: 'chica', crustId: 'delgada', priceCents: 1 }],
    })

    expect(res.status).toBe(201)
    expect((await res.json()).totalCents).toBe(12900)
  })

  it('responde 400 si la pizza tiene demasiados ingredientes', async () => {
    const res = await crearPedido({
      pizzas: [{ sizeId: 'chica', crustId: 'delgada', toppingIds: Array(6).fill('pepperoni') }],
    })

    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('DEMASIADOS_INGREDIENTES')
  })

  it('responde 400 si la pizza no tiene tamaño', async () => {
    const res = await crearPedido({ pizzas: [{ crustId: 'delgada' }] })

    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('TAMANO_REQUERIDO')
  })

  it('responde 400 si no viene el arreglo de pizzas', async () => {
    const res = await crearPedido({})

    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('PEDIDO_INVALIDO')
  })

  it('responde 400 si el cuerpo no es JSON', async () => {
    const res = await app.request(
      '/orders',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'esto no es json' },
      env
    )

    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('PEDIDO_INVALIDO')
  })

  it.each([
    ['una pizza null', { pizzas: [null] }],
    ['toppingIds que no es arreglo', { pizzas: [{ sizeId: 'chica', crustId: 'delgada', toppingIds: 5 }] }],
  ])('responde 400 PIZZA_INVALIDA con %s', async (_caso, body) => {
    const res = await crearPedido(body)

    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('PIZZA_INVALIDA')
  })
})

describe('GET /orders/:id', () => {
  it('devuelve un pedido que ya existe', async () => {
    const creado = await (await crearPedido({ pizzas: [{ sizeId: 'chica', crustId: 'delgada' }] })).json()

    const res = await app.request(`/orders/${creado.id}`, {}, env)

    expect(res.status).toBe(200)
    const pedido = await res.json()
    expect(pedido.id).toBe(creado.id)
    expect(pedido.totalCents).toBe(12900)
  })

  it('responde 404 si el pedido no existe', async () => {
    const res = await app.request('/orders/no-existe', {}, env)

    expect(res.status).toBe(404)
    expect((await res.json()).error.code).toBe('PEDIDO_NO_ENCONTRADO')
  })
})

describe('CORS', () => {
  const envConCors = {
    ENVIRONMENT: 'test',
    VERSION: '1.2.3',
    ALLOWED_ORIGINS: 'http://localhost:5173, https://ejemplo.pages.dev',
  } as Bindings

  it('da permiso a un origen de la lista', async () => {
    const res = await app.request('/menu', { headers: { Origin: 'http://localhost:5173' } }, envConCors)

    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173')
  })

  it('no da permiso a un origen fuera de la lista', async () => {
    const res = await app.request('/menu', { headers: { Origin: 'https://sitio-ajeno.com' } }, envConCors)

    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
  })

  it('responde la verificación previa (preflight) de POST /orders', async () => {
    const res = await app.request(
      '/orders',
      {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://ejemplo.pages.dev',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type',
        },
      },
      envConCors
    )

    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://ejemplo.pages.dev')
  })

  it('también da permiso en las respuestas de error', async () => {
    const res = await app.request(
      '/orders',
      { method: 'POST', headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json' }, body: '{}' },
      envConCors
    )

    expect(res.status).toBe(400)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173')
  })
})

describe('GET /health', () => {
  it('responde ok con la versión y el ambiente', async () => {
    const res = await app.request('/health', {}, env)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok', version: '1.2.3', environment: 'test' })
  })
})

describe('Observabilidad (ganchos para Sentry)', () => {
  it('avisa los pedidos creados y los errores controlados', async () => {
    const pedidos: number[] = []
    const errores: string[] = []
    const appObservada = createApp(() => ({ menu: repoMenuFalso, orders: crearRepoPedidosEnMemoria() }), {
      pedidoCreado: (pedido) => pedidos.push(pedido.totalCents),
      errorControlado: (error) => errores.push(error.code),
    })
    const pedir = (body: unknown) =>
      appObservada.request(
        '/orders',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
        env
      )

    await pedir({ pizzas: [{ sizeId: 'chica', crustId: 'delgada' }] }) // válido
    await pedir({ pizzas: [{ crustId: 'delgada' }] }) // sin tamaño

    expect(pedidos).toEqual([12900])
    expect(errores).toEqual(['TAMANO_REQUERIDO'])
  })

  it('llama a instrumentar al crear la app', () => {
    let llamado = false
    createApp(() => ({ menu: repoMenuFalso, orders: crearRepoPedidosEnMemoria() }), {
      instrumentar: () => {
        llamado = true
      },
    })

    expect(llamado).toBe(true)
  })
})