import { describe, it, expect, beforeEach } from 'vitest'
import { abrirBaseDeDatos } from './database'
import { SqliteMenuRepository } from './sqlite-menu-repository'
import { SqliteOrderRepository } from './sqlite-order-repository'
import { priceOrder } from '../domain/pricing'

let menuRepo: SqliteMenuRepository
let pedidosRepo: SqliteOrderRepository

beforeEach(() => {
  // Base nueva en memoria para cada prueba, con las migraciones reales
  const { db } = abrirBaseDeDatos(':memory:', 'migrations')
  menuRepo = new SqliteMenuRepository(db)
  pedidosRepo = new SqliteOrderRepository(db)
})

describe('Repositorios SQLite (Docker)', () => {
  it('el menú trae los datos semilla de las migraciones', async () => {
    const menu = await menuRepo.getMenu()

    expect(menu.sizes).toHaveLength(3)
    expect(menu.crusts).toHaveLength(3)
    expect(menu.toppings).toHaveLength(8)
    expect(menu.sizes[0]).toEqual({ id: 'chica', name: 'Chica', priceCents: 12900 })
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
    expect(pedido?.items.map((item) => item.toppingIds)).toEqual([['pepperoni', 'champinones'], []])
  })

  it('regresa null si el pedido no existe', async () => {
    expect(await pedidosRepo.findById('no-existe')).toBeNull()
  })
})