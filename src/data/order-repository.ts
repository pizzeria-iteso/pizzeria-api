import type { PricedOrder, PricedPizza } from '../domain/pricing'

export type OrderStatus = 'recibido' | 'preparando' | 'listo'

export type Order = {
  id: string
  status: OrderStatus
  totalCents: number
  createdAt: string
  items: PricedPizza[]
}

// Contrato para guardar y consultar pedidos (hoy D1; en Docker, SQLite)
export interface OrderRepository {
  save(id: string, order: PricedOrder): Promise<void>
  findById(id: string): Promise<Order | null>
}