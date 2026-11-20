import type { DatabaseSync } from 'node:sqlite'
import type { MenuRepository } from '../data/menu-repository'
import type { Menu, MenuItem } from '../domain/pricing'

type MenuRow = { id: string; name: string; price_cents: number }

// Misma lógica que D1MenuRepository, pero con SQLite de Node
export class SqliteMenuRepository implements MenuRepository {
  private readonly db: DatabaseSync

  constructor(db: DatabaseSync) {
    this.db = db
  }

  private list(sql: string): MenuItem[] {
    const filas = this.db.prepare(sql).all() as unknown as MenuRow[]
    return filas.map((fila) => ({ id: fila.id, name: fila.name, priceCents: fila.price_cents }))
  }

  async getMenu(): Promise<Menu> {
    return {
      sizes: this.list('SELECT id, name, price_cents FROM sizes ORDER BY price_cents, id'),
      crusts: this.list('SELECT id, name, price_cents FROM crusts ORDER BY price_cents, id'),
      toppings: this.list('SELECT id, name, price_cents FROM toppings ORDER BY name'),
    }
  }
}