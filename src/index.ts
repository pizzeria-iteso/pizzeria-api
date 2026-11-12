import { Hono } from 'hono'

// Variables que Cloudflare le pasa al Worker (vienen de wrangler.jsonc)
type Bindings = {
  ENVIRONMENT: string
  VERSION: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/health', (c) =>
  c.json({
    status: 'ok',
    version: c.env.VERSION,
    environment: c.env.ENVIRONMENT,
  })
)

export default app