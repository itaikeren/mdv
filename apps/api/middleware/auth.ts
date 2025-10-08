import { clerkMiddleware, getAuth } from '@hono/clerk-auth'
import type { Context } from 'hono'

export { clerkMiddleware, getAuth }

// Helper to ensure user is authenticated
export async function requireAuth(c: Context) {
  const auth = getAuth(c)
  if (!auth?.userId) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  return null
}
