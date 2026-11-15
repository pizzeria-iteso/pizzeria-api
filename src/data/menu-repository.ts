import type { Menu } from '../domain/pricing'

// Contrato para leer el menú. Hoy lo implementa D1.
// En el Bloque 6 (Docker) habrá otra implementación con SQLite.
export interface MenuRepository {
  getMenu(): Promise<Menu>
}