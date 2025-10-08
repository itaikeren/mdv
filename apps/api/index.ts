import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { cors } from 'hono/cors'
import { clerkMiddleware } from './middleware/auth'
import filesRoutes from './routes/files'
import sharesRoutes from './routes/shares'

// Create Hono app
const app = new Hono().basePath('/api')

// Middleware
app.use('*', cors({
  origin: (origin) => origin, // Allow all origins in dev, Vercel will use CORS headers
  credentials: true,
}))
app.use('*', clerkMiddleware())

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.route('/files', filesRoutes)
app.route('/shares', sharesRoutes)

// Export for Vercel Functions
export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const DELETE = handle(app)
export const PATCH = handle(app)

// For local development
export default app
