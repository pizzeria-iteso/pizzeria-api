import { createApp } from './app'
import { D1MenuRepository } from './data/d1-menu-repository'
import { D1OrderRepository } from './data/d1-order-repository'

// Punto de entrada del Worker: conecta la app con D1
export default createApp((env) => ({
  menu: new D1MenuRepository(env.DB),
  orders: new D1OrderRepository(env.DB),
}))