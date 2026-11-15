import type { Menu, MenuItem } from '../domain/pricing'
import type { MenuRepository } from './menu-repository'

// Así llega cada fila desde D1 (nombres de columna de la base)
type MenuRow = {
  id: string
  name: string
  price_cents: number
}

function toMenuItem(row: MenuRow): MenuItem {
  return { id: row.id, name: row.name, priceCents: row.price_cents }
}

export class D1MenuRepository implements MenuRepository {
  private readonly db: D1Database

  constructor(db: D1Database) {
    this.db = db
  }

  private async list(sql: string): Promise<MenuItem[]> {
    const { results } = await this.db.prepare(sql).all<MenuRow>()
    return results.map(toMenuItem)
  }

  async getMenu(): Promise<Menu> {
    // Las tres consultas se hacen al mismo tiempo
    const [sizes, crusts, toppings] = await Promise.all([
      this.list('SELECT id, name, price_cents FROM sizes ORDER BY price_cents, id'),
      this.list('SELECT id, name, price_cents FROM crusts ORDER BY price_cents, id'),
      this.list('SELECT id, name, price_cents FROM toppings ORDER BY name'),
    ])
    return { sizes, crusts, toppings }
  }
}