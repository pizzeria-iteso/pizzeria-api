import type { DatabaseSync } from 'node:sqlite'
import type { Order, OrderRepository, OrderStatus } from '../data/order-repository'
import type { PricedOrder } from '../domain/pricing'

type OrderRow = { id: string; status: OrderStatus; total_cents: number; created_at: string }
type ItemRow = { id: number; size_id: string; crust_id: string; quantity: number; unit_price_cents: number }
type ToppingRow = { order_item_id: number; topping_id: string }

// Misma lógica que D1OrderRepository, pero con SQLite de Node
export class SqliteOrderRepository implements OrderRepository {
  private readonly db: DatabaseSync

  constructor(db: DatabaseSync) {
    this.db = db
  }

  async save(id: string, order: PricedOrder): Promise<void> {
    const insertarPedido = this.db.prepare('INSERT INTO orders (id, total_cents) VALUES (?, ?)')
    const insertarPizza = this.db.prepare(
      'INSERT INTO order_items (order_id, size_id, crust_id, quantity, unit_price_cents) VALUES (?, ?, ?, ?, ?)'
    )
    const insertarIngrediente = this.db.prepare(
      'INSERT INTO order_item_toppings (order_item_id, topping_id) VALUES (?, ?)'
    )

    // Transacción: se guarda todo o nada
    this.db.exec('BEGIN')
    try {
      insertarPedido.run(id, order.totalCents)
      for (const item of order.items) {
        // En SQLite de Node sí tenemos el id de la pizza recién insertada
        const { lastInsertRowid } = insertarPizza.run(
          id,
          item.sizeId,
          item.crustId,
          item.quantity,
          item.unitPriceCents
        )
        for (const toppingId of item.toppingIds) {
          insertarIngrediente.run(lastInsertRowid, toppingId)
        }
      }
      this.db.exec('COMMIT')
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }

  async findById(id: string): Promise<Order | null> {
    const pedido = this.db
      .prepare('SELECT id, status, total_cents, created_at FROM orders WHERE id = ?')
      .get(id) as unknown as OrderRow | undefined

    if (!pedido) return null

    const pizzas = this.db
      .prepare('SELECT id, size_id, crust_id, quantity, unit_price_cents FROM order_items WHERE order_id = ? ORDER BY id')
      .all(id) as unknown as ItemRow[]

    const ingredientes = this.db
      .prepare(
        `SELECT oit.order_item_id, oit.topping_id
         FROM order_item_toppings oit
         JOIN order_items oi ON oi.id = oit.order_item_id
         WHERE oi.order_id = ?
         ORDER BY oit.rowid`
      )
      .all(id) as unknown as ToppingRow[]

    return {
      id: pedido.id,
      status: pedido.status,
      totalCents: pedido.total_cents,
      createdAt: pedido.created_at,
      items: pizzas.map((pizza) => ({
        sizeId: pizza.size_id,
        crustId: pizza.crust_id,
        toppingIds: ingredientes.filter((t) => t.order_item_id === pizza.id).map((t) => t.topping_id),
        quantity: pizza.quantity,
        unitPriceCents: pizza.unit_price_cents,
        subtotalCents: pizza.unit_price_cents * pizza.quantity,
      })),
    }
  }
}