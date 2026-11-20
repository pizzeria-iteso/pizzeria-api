import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

// Abre (o crea) la base SQLite y aplica las migraciones que falten.
// Usa los mismos archivos de migrations/ que D1: ambas bases tienen el mismo esquema y menú.
// Regresa la base abierta y la lista de migraciones que se aplicaron esta vez.
export function abrirBaseDeDatos(ruta: string, carpetaMigraciones: string) {
  if (ruta !== ':memory:') mkdirSync(dirname(ruta), { recursive: true })

  const db = new DatabaseSync(ruta)
  db.exec('PRAGMA foreign_keys = ON')
  db.exec(`CREATE TABLE IF NOT EXISTS migraciones_aplicadas (
    nombre      TEXT PRIMARY KEY,
    aplicada_en TEXT NOT NULL DEFAULT (datetime('now'))
  )`)

  const yaAplicadas = new Set(
    db.prepare('SELECT nombre FROM migraciones_aplicadas').all().map((fila) => String(fila.nombre))
  )

  const archivos = readdirSync(carpetaMigraciones)
    .filter((archivo) => archivo.endsWith('.sql'))
    .sort()

  const aplicadas: string[] = []
  for (const archivo of archivos) {
    if (yaAplicadas.has(archivo)) continue

    const sql = readFileSync(join(carpetaMigraciones, archivo), 'utf8')
    db.exec('BEGIN')
    try {
      db.exec(sql)
      db.prepare('INSERT INTO migraciones_aplicadas (nombre) VALUES (?)').run(archivo)
      db.exec('COMMIT')
      aplicadas.push(archivo)
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  }

  return { db, aplicadas }
}