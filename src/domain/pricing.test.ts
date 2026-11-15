import { describe, it, expect } from 'vitest'
import {
  MAX_INGREDIENTES,
  PizzaValidationError,
  priceOrder,
  pricePizza,
  type Menu,
} from './pricing'

// Menú de prueba con los mismos precios que los datos semilla (en centavos)
const menu: Menu = {
  sizes: [
    { id: 'chica', name: 'Chica', priceCents: 12900 },
    { id: 'mediana', name: 'Mediana', priceCents: 16900 },
    { id: 'grande', name: 'Grande', priceCents: 20900 },
  ],
  crusts: [
    { id: 'delgada', name: 'Delgada', priceCents: 0 },
    { id: 'tradicional', name: 'Tradicional', priceCents: 1500 },
    { id: 'orilla-rellena', name: 'Orilla rellena', priceCents: 3500 },
  ],
  toppings: [
    { id: 'pepperoni', name: 'Pepperoni', priceCents: 2500 },
    { id: 'jamon', name: 'Jamón', priceCents: 2000 },
    { id: 'champinones', name: 'Champiñones', priceCents: 1800 },
    { id: 'pimiento', name: 'Pimiento', priceCents: 1500 },
    { id: 'cebolla', name: 'Cebolla', priceCents: 1200 },
    { id: 'aceitunas', name: 'Aceitunas', priceCents: 1800 },
  ],
}

// Ejecuta la función y regresa el código del error de validación (o undefined si no falló)
function codigoDeError(fn: () => unknown): string | undefined {
  try {
    fn()
  } catch (error) {
    if (error instanceof PizzaValidationError) return error.code
    throw error
  }
  return undefined
}

describe('pricePizza: casos válidos', () => {
  it('suma tamaño + masa + ingredientes', () => {
    const pizza = pricePizza(menu, {
      sizeId: 'mediana',
      crustId: 'tradicional',
      toppingIds: ['pepperoni', 'champinones'],
    })
    // 16900 + 1500 + 2500 + 1800
    expect(pizza.unitPriceCents).toBe(22700)
  })

  it('sin ingredientes cuesta tamaño + masa', () => {
    const pizza = pricePizza(menu, { sizeId: 'chica', crustId: 'delgada' })
    expect(pizza.unitPriceCents).toBe(12900)
  })

  it('si no se manda cantidad, es 1', () => {
    const pizza = pricePizza(menu, { sizeId: 'chica', crustId: 'delgada' })
    expect(pizza.quantity).toBe(1)
    expect(pizza.subtotalCents).toBe(12900)
  })

  it('multiplica el precio por la cantidad', () => {
    const pizza = pricePizza(menu, { sizeId: 'grande', crustId: 'orilla-rellena', quantity: 3 })
    // (20900 + 3500) x 3
    expect(pizza.subtotalCents).toBe(73200)
  })

  it(`acepta exactamente ${MAX_INGREDIENTES} ingredientes`, () => {
    const pizza = pricePizza(menu, {
      sizeId: 'chica',
      crustId: 'delgada',
      toppingIds: ['pepperoni', 'jamon', 'champinones', 'pimiento', 'cebolla'],
    })
    // 12900 + 0 + 2500 + 2000 + 1800 + 1500 + 1200
    expect(pizza.unitPriceCents).toBe(21900)
  })
})

describe('pricePizza: casos inválidos', () => {
  it('rechaza una pizza sin tamaño', () => {
    expect(codigoDeError(() => pricePizza(menu, { crustId: 'delgada' }))).toBe('TAMANO_REQUERIDO')
  })

  it('rechaza una pizza sin masa', () => {
    expect(codigoDeError(() => pricePizza(menu, { sizeId: 'chica' }))).toBe('MASA_REQUERIDA')
  })

  it('rechaza un tamaño que no existe', () => {
    expect(codigoDeError(() => pricePizza(menu, { sizeId: 'familiar', crustId: 'delgada' }))).toBe(
      'TAMANO_INEXISTENTE'
    )
  })

  it('rechaza una masa que no existe', () => {
    expect(codigoDeError(() => pricePizza(menu, { sizeId: 'chica', crustId: 'integral' }))).toBe(
      'MASA_INEXISTENTE'
    )
  })

  it('rechaza un ingrediente que no existe', () => {
    expect(
      codigoDeError(() => pricePizza(menu, { sizeId: 'chica', crustId: 'delgada', toppingIds: ['anchoas'] }))
    ).toBe('INGREDIENTE_INEXISTENTE')
  })

  it(`rechaza más de ${MAX_INGREDIENTES} ingredientes`, () => {
    expect(
      codigoDeError(() =>
        pricePizza(menu, {
          sizeId: 'chica',
          crustId: 'delgada',
          toppingIds: ['pepperoni', 'jamon', 'champinones', 'pimiento', 'cebolla', 'aceitunas'],
        })
      )
    ).toBe('DEMASIADOS_INGREDIENTES')
  })

  it('rechaza un ingrediente repetido', () => {
    expect(
      codigoDeError(() =>
        pricePizza(menu, { sizeId: 'chica', crustId: 'delgada', toppingIds: ['pepperoni', 'pepperoni'] })
      )
    ).toBe('INGREDIENTE_REPETIDO')
  })

  it.each([0, -1, 1.5])('rechaza la cantidad %s', (quantity) => {
    expect(codigoDeError(() => pricePizza(menu, { sizeId: 'chica', crustId: 'delgada', quantity }))).toBe(
      'CANTIDAD_INVALIDA'
    )
  })
})

describe('priceOrder', () => {
  it('suma los subtotales de todas las pizzas', () => {
    const order = priceOrder(menu, [
      { sizeId: 'mediana', crustId: 'tradicional', toppingIds: ['pepperoni', 'champinones'] }, // 22700
      { sizeId: 'chica', crustId: 'delgada', quantity: 2 }, // 12900 x 2 = 25800
    ])
    expect(order.items).toHaveLength(2)
    expect(order.totalCents).toBe(48500)
  })

  it('rechaza un pedido sin pizzas', () => {
    expect(codigoDeError(() => priceOrder(menu, []))).toBe('PEDIDO_VACIO')
  })

  it('si una pizza es inválida, rechaza todo el pedido', () => {
    expect(
      codigoDeError(() =>
        priceOrder(menu, [
          { sizeId: 'chica', crustId: 'delgada' },
          { crustId: 'delgada' }, // sin tamaño
        ])
      )
    ).toBe('TAMANO_REQUERIDO')
  })
})