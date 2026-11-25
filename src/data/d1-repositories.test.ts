import { describe, it, expect, beforeEach } from 'vitest'
import { crearD1DePrueba } from '../test/d1-de-prueba'
import { D1MenuRepository } from './d1-menu-repository'
import { D1OrderRepository } from './d1-order-repository'
import { priceOrder } from '../domain/pricing'

let menuRepo: D1MenuRepository
let pedidosRepo: D1OrderRepository

beforeEach(() => {
  // D1 nueva para cada prueba, con las migraciones reales
  const db = crearD1DePrueba()
  menuRepo = new D1MenuRepository(db)
  pedidosRepo = new D1OrderRepository(db)
})

describe('Repositorios D1 (Cloudflare)', () => {
  it('el menú trae tamaños y masas ordenados por precio, e ingredientes por nombre', async () => {
    const menu = await menuRepo.getMenu()

    expect(menu.sizes.map((s) => s.id)).toEqual(['chica', 'mediana', 'grande'])
    expect(menu.crusts.map((c) => c.id)).toEqual(['delgada', 'tradicional', 'orilla-rellena'])
    expect(menu.toppings).toHaveLength(8)
    expect(menu.toppings[0]).toEqual({ id: 'aceitunas', name: 'Aceitunas', priceCents: 1800 })
  })

  it('guarda y recupera un pedido con sus pizzas e ingredientes', async () => {
    const menu = await menuRepo.getMenu()
    const precio = priceOrder(menu, [
      { sizeId: 'mediana', crustId: 'tradicional', toppingIds: ['pepperoni', 'champinones'] }, // 22700
      { sizeId: 'chica', crustId: 'delgada', quantity: 2 }, // 25800
    ])

    await pedidosRepo.save('pedido-1', precio)
    const pedido = await pedidosRepo.findById('pedido-1')

    expect(pedido?.status).toBe('recibido')
    expect(pedido?.totalCents).toBe(48500)
    expect(pedido?.createdAt).toBeTruthy()
    expect(pedido?.items).toEqual([
      { sizeId: 'mediana', crustId: 'tradicional', toppingIds: ['pepperoni', 'champinones'], quantity: 1, unitPriceCents: 22700, subtotalCents: 22700 },
      { sizeId: 'chica', crustId: 'delgada', toppingIds: [], quantity: 2, unitPriceCents: 12900, subtotalCents: 25800 },
    ])
  })

  it('no mezcla las pizzas de pedidos distintos', async () => {
    const menu = await menuRepo.getMenu()
    await pedidosRepo.save('a', priceOrder(menu, [{ sizeId: 'grande', crustId: 'delgada', toppingIds: ['pina'] }]))
    await pedidosRepo.save('b', priceOrder(menu, [{ sizeId: 'chica', crustId: 'delgada', toppingIds: ['jamon'] }]))

    const pedidoA = await pedidosRepo.findById('a')
    expect(pedidoA?.items).toHaveLength(1)
    expect(pedidoA?.items[0].toppingIds).toEqual(['pina'])
  })

  it('regresa null si el pedido no existe', async () => {
    expect(await pedidosRepo.findById('no-existe')).toBeNull()
  })

  it('si una parte del pedido falla no se guarda nada (transacción)', async () => {
    const pedidoInvalido = {
      totalCents: 12900,
      items: [{ sizeId: 'familiar', crustId: 'delgada', toppingIds: [], quantity: 1, unitPriceCents: 12900, subtotalCents: 12900 }],
    }

    await expect(pedidosRepo.save('roto', pedidoInvalido)).rejects.toThrow()
    expect(await pedidosRepo.findById('roto')).toBeNull()
  })
})
