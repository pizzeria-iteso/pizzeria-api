// D1 de prueba: imita lo que usan los repositorios de la API de Cloudflare D1
// (prepare, bind, first, all y batch) sobre una base SQLite en memoria con las migraciones reales.
// Solo se usa en las pruebas; en Cloudflare los repositorios reciben la D1 de verdad.
import { abrirBaseDeDatos } from '../node/database'

type Valor = string | number | null

export function crearD1DePrueba(): D1Database {
  const { db } = abrirBaseDeDatos(':memory:', 'migrations')

  const sentencia = (sql: string, valores: Valor[] = []) => ({
    bind: (...nuevos: Valor[]) => sentencia(sql, nuevos),
    first: async () => db.prepare(sql).get(...valores) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...valores), success: true }),
    run: () => db.prepare(sql).run(...valores),
  })

  return {
    prepare: (sql: string) => sentencia(sql),
    // batch de D1 = una sola transacción: se guarda todo o nada
    batch: async (sentencias: ReturnType<typeof sentencia>[]) => {
      db.exec('BEGIN')
      try {
        const resultados = sentencias.map((s) => s.run())
        db.exec('COMMIT')
        return resultados
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
    },
  } as unknown as D1Database
}
