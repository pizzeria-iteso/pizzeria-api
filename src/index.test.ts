import { describe, it, expect } from 'vitest'
import app from './index'

describe('GET /health', () => {
  it('responde ok con la versión y el ambiente', async () => {
    // El tercer parámetro simula las variables que daría Cloudflare
    const res = await app.request('/health', {}, { ENVIRONMENT: 'test', VERSION: '1.2.3' })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      status: 'ok',
      version: '1.2.3',
      environment: 'test',
    })
  })
})