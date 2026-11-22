// Lógica pura del precio de la pizza.
// No depende de Hono ni de D1: recibe el menú como datos y regresa el precio.
// Todos los precios están en centavos (16900 = $169.00).

export const MAX_INGREDIENTES = 5
export const MAX_CANTIDAD_POR_PIZZA = 20
export const MAX_PIZZAS_POR_PEDIDO = 10

export type MenuItem = {
  id: string
  name: string
  priceCents: number
}

export type Menu = {
  sizes: MenuItem[]
  crusts: MenuItem[]
  toppings: MenuItem[]
}

// Lo que pide el cliente. Los campos son opcionales porque vienen del exterior
// y hay que validarlos.
export type PizzaRequest = {
  sizeId?: string
  crustId?: string
  toppingIds?: string[]
  quantity?: number
}

export type PricedPizza = {
  sizeId: string
  crustId: string
  toppingIds: string[]
  quantity: number
  unitPriceCents: number
  subtotalCents: number
}

export type PricedOrder = {
  items: PricedPizza[]
  totalCents: number
}

// Error controlado: pedido inválido por culpa del cliente (la API responderá 400).
export class PizzaValidationError extends Error {
  readonly code: string
  // Le dice a Sentry que es un error del cliente (4xx) y no una falla del servidor
  readonly status = 400

  constructor(code: string, message: string) {
    super(message)
    this.name = 'PizzaValidationError'
    this.code = code
  }
}

function findItem(items: MenuItem[], id: string): MenuItem | undefined {
  return items.find((item) => item.id === id)
}

export function pricePizza(menu: Menu, pizza: PizzaRequest): PricedPizza {
  if (!pizza.sizeId) {
    throw new PizzaValidationError('TAMANO_REQUERIDO', 'La pizza debe tener tamaño')
  }
  if (!pizza.crustId) {
    throw new PizzaValidationError('MASA_REQUERIDA', 'La pizza debe tener masa')
  }

  const size = findItem(menu.sizes, pizza.sizeId)
  if (!size) {
    throw new PizzaValidationError('TAMANO_INEXISTENTE', `No existe el tamaño "${pizza.sizeId}"`)
  }

  const crust = findItem(menu.crusts, pizza.crustId)
  if (!crust) {
    throw new PizzaValidationError('MASA_INEXISTENTE', `No existe la masa "${pizza.crustId}"`)
  }

  const toppingIds = pizza.toppingIds ?? []

  if (toppingIds.length > MAX_INGREDIENTES) {
    throw new PizzaValidationError(
      'DEMASIADOS_INGREDIENTES',
      `Máximo ${MAX_INGREDIENTES} ingredientes por pizza (se recibieron ${toppingIds.length})`
    )
  }

  if (new Set(toppingIds).size !== toppingIds.length) {
    throw new PizzaValidationError('INGREDIENTE_REPETIDO', 'No se puede repetir un ingrediente en la misma pizza')
  }

  let toppingsCents = 0
  for (const id of toppingIds) {
    const topping = findItem(menu.toppings, id)
    if (!topping) {
      throw new PizzaValidationError('INGREDIENTE_INEXISTENTE', `No existe el ingrediente "${id}"`)
    }
    toppingsCents += topping.priceCents
  }

  const quantity = pizza.quantity ?? 1
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new PizzaValidationError('CANTIDAD_INVALIDA', 'La cantidad debe ser un número entero mayor que 0')
  }
  if (quantity > MAX_CANTIDAD_POR_PIZZA) {
    throw new PizzaValidationError(
      'CANTIDAD_EXCEDIDA',
      `Máximo ${MAX_CANTIDAD_POR_PIZZA} unidades de la misma pizza (se recibieron ${quantity})`
    )
  }

  const unitPriceCents = size.priceCents + crust.priceCents + toppingsCents

  return {
    sizeId: size.id,
    crustId: crust.id,
    toppingIds,
    quantity,
    unitPriceCents,
    subtotalCents: unitPriceCents * quantity,
  }
}

export function priceOrder(menu: Menu, pizzas: PizzaRequest[]): PricedOrder {
  if (!Array.isArray(pizzas) || pizzas.length === 0) {
    throw new PizzaValidationError('PEDIDO_VACIO', 'El pedido debe tener al menos una pizza')
  }
  if (pizzas.length > MAX_PIZZAS_POR_PEDIDO) {
    throw new PizzaValidationError(
      'DEMASIADAS_PIZZAS',
      `Máximo ${MAX_PIZZAS_POR_PEDIDO} pizzas por pedido (se recibieron ${pizzas.length})`
    )
  }
  const items = pizzas.map((pizza) => pricePizza(menu, pizza))
  const totalCents = items.reduce((sum, item) => sum + item.subtotalCents, 0)

  return { items, totalCents }
}