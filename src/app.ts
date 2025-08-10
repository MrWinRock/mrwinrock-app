// app.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { connectMongo } from './db/mongo'
import routes from './routes'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { env } from './config/env'

const app = new Hono()

app.use('*', cors({ origin: env.ADMIN_ORIGIN, credentials: true }))

const jwks = createRemoteJWKSet(new URL(`https://${env.CF_ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`))
const requireAccess = async (c: any, next: any) => {
  const t = c.req.header('Cf-Access-Jwt-Assertion')
  if (!t) return c.text('unauthorized', 401)
  try {
    await jwtVerify(t, jwks, { issuer: `https://${env.CF_ACCESS_TEAM_DOMAIN}`, audience: env.CF_ACCESS_AUD })
    return next()
  } catch {
    return c.text('forbidden', 403)
  }
}

app.get('/', c => c.json({ ok: true, message: 'Welcome to MrWinRock API' }))

app.get('/health', async c => {
  try {
    const db = await connectMongo()
    await db.command({ ping: 1 })
    return c.json({ ok: true, status: 'live', uptime: process.uptime(), timestamp: new Date().toISOString() })
  } catch (e) {
    return c.json({ ok: false, error: (e as Error).message }, 500)
  }
})

app.get('/fish', c => c.json({ fish: '<><' }))

app.use('/admin/*', requireAccess)

app.route('/api', routes)

export default app
