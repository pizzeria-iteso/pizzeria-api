import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/test/**', // ayudas para las pruebas
        // Interfaces: solo tienen tipos, no hay código que ejecutar
        'src/data/menu-repository.ts',
        'src/data/order-repository.ts',
        // Puntos de entrada: solo conectan la app con D1/Sentry o con SQLite.
        // Se comprueban en el pipeline con /health después de cada deploy.
        'src/index.ts',
        'src/node/server.ts',
      ],
      reporter: [['text', { skipFull: false, maxCols: 120 }], 'json-summary', 'html'],
      reportsDirectory: 'reporte/cobertura',
      // El pipeline falla si la cobertura baja de estos mínimos
      thresholds: {
        lines: 80,
        statements: 80,
        branches: 80,
        functions: 80,
      },
    },
  },
})
