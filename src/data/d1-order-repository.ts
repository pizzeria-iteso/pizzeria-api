import type { PricedOrder, PricedPizza } from '../domain/pricing'
import type { Order, OrderRepository, OrderStatus } from './order-repository'

type OrderRow = { id: string; status: OrderStatus; total_cents: number; created_at: string }
type ItemRow = { id: number; size_id: string; crust_id: string; quantity: number; unit_price_cents: number }
type ToppingRow = { order_item_id: number; topping_id: string }

export class D1OrderRepository implements OrderRepository {
  private readonly db: D1Database

  constructor(db: D1Database) {
    this.db = db
  }

  async save(id: string, order: PricedOrder): Promise<void> {
    const statements: D1PreparedStatement[] = [
      this.db.prepare('INSERT INTO orders (id, total_cents) VALUES (?, ?)').bind(id, order.totalCents),
    ]

    for (const item of order.items) {
      statements.push(
        this.db
          .prepare(
            'INSERT INTO order_items (order_id, size_id, crust_id, quantity, unit_price_cents) VALUES (?, ?, ?, ?, ?)'
          )
          .bind(id, item.sizeId, item.crustId, item.quantity, item.unitPriceCents)
      )

      for (const toppingId of item.toppingIds) {
        // La pizza recién insertada es la de id más alto dentro de este pedido
        statements.push(
          this.db
            .prepare(
              'INSERT INTO order_item_toppings (order_item_id, topping_id) VALUES ((SELECT MAX(id) FROM order_items WHERE order_id = ?), ?)'
            )
            .bind(id, toppingId)
        )
      }
    }

    // batch = una sola transacción: se guarda todo o nada
    await this.db.batch(statements)
  }

  async findById(id: string): Promise<Order | null> {
    const order = await this.db
      .prepare('SELECT id, status, total_cents, created_at FROM orders WHERE id = ?')
      .bind(id)
      .first<OrderRow>()

    if (!order) return null

    const [items, toppings] = await Promise.all([
      this.db
        .prepare(
          'SELECT id, size_id, crust_id, quantity, unit_price_cents FROM order_items WHERE order_id = ? ORDER BY id'
        )
        .bind(id)
        .all<ItemRow>(),
      this.db
        .prepare(
          `SELECT oit.order_item_id, oit.topping_id
           FROM order_item_toppings oit
           JOIN order_items oi ON oi.id = oit.order_item_id
           WHERE oi.order_id = ?
           ORDER BY oit.rowid`
        )
        .bind(id)
        .all<ToppingRow>(),
    ])

    return {
      id: order.id,
      status: order.status,
      totalCents: order.total_cents,
      createdAt: order.created_at,
      items: items.results.map(
        (item): PricedPizza => ({
          sizeId: item.size_id,
          crustId: item.crust_id,
          toppingIds: toppings.results.filter((t) => t.order_item_id === item.id).map((t) => t.topping_id),
          quantity: item.quantity,
          unitPriceCents: item.unit_price_cents,
          subtotalCents: item.unit_price_cents * item.quantity,
        })
      ),
    }
  }
}