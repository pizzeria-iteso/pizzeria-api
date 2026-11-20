// Convierte el reporte JUnit de Vitest en una tabla Markdown para el resumen del pipeline.
// Uso: node scripts/resumen-pruebas.mjs reporte/pruebas.xml >> "$GITHUB_STEP_SUMMARY"
import { existsSync, readFileSync } from 'node:fs'

const ruta = process.argv[2] ?? 'reporte/pruebas.xml'

if (!existsSync(ruta)) {
  console.log('## 🧪 Pruebas unitarias\n\n⚠️ No se generó el reporte de pruebas.')
  process.exit(0)
}

const xml = readFileSync(ruta, 'utf8')
const atributo = (texto, nombre) => Number(texto.match(new RegExp(`${nombre}="(\\d+)"`))?.[1] ?? 0)

const filas = []
const totales = { pruebas: 0, fallidas: 0, omitidas: 0 }

for (const [, encabezado, cuerpo] of xml.matchAll(/<testsuite\b([^>]*)>([\s\S]*?)<\/testsuite>/g)) {
  const archivo = encabezado.match(/name="([^"]*)"/)?.[1] ?? '(sin nombre)'
  const pruebas = atributo(encabezado, 'tests')
  const fallidas = atributo(encabezado, 'failures') + atributo(encabezado, 'errors')
  const omitidas = atributo(encabezado, 'skipped')
  const pasaron = pruebas - fallidas - omitidas
  totales.pruebas += pruebas
  totales.fallidas += fallidas
  totales.omitidas += omitidas
  filas.push(`| ${fallidas ? '❌' : '✅'} | \`${archivo}\` | ${pasaron} | ${fallidas} | ${omitidas} |`)

  // Nombre de cada prueba que falló, para encontrarla rápido
  for (const [, caso] of cuerpo.matchAll(/<testcase\b[^>]*name="([^"]*)"[^>]*>\s*<(failure|error)\b/g)) {
    const nombre = caso.replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&')
    filas.push(`| | ↳ ${nombre} | | | |`)
  }
}

const pasaron = totales.pruebas - totales.fallidas - totales.omitidas
console.log(`## 🧪 Pruebas unitarias: ${totales.fallidas ? '❌ hay pruebas que fallaron' : '✅ todas pasaron'}

**${pasaron} de ${totales.pruebas} pasaron** · ${totales.fallidas} fallaron · ${totales.omitidas} omitidas

| | Archivo | Pasaron | Fallaron | Omitidas |
|---|---|---|---|---|
${filas.join('\n')}
`)
