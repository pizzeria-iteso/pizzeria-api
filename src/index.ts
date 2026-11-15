import { createApp } from './app'
import { D1MenuRepository } from './data/d1-menu-repository'

// Punto de entrada del Worker: conecta la app con D1
export default createApp((env) => ({
  menu: new D1MenuRepository(env.DB),
}))