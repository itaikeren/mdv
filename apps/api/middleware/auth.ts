import { clerkMiddleware, getAuth as clerkGetAuth } from '@hono/clerk-auth'
import type { Context } from 'hono'

export { clerkMiddleware }

// Re-export getAuth with non-null assertion helper
export function getAuth(c: Context) {
  return clerkGetAuth(c)
}

// Helper to ensure user is authenticated and return auth
export async function requireAuth(c: Context) {
  const auth = clerkGetAuth(c)
  if (!auth?.userId) {
    return { error: c.json({ error: 'Unauthorized' }, 401), auth: null }
  }
  return { error: null, auth }
}
