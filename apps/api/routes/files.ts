import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { db } from '../db/client'
import { files, users } from '../db/schema'
import { getAuth, requireAuth } from '../middleware/auth'
import type { CreateFileInput, UpdateFileInput } from '@markdown-viewer/shared'

const app = new Hono()

// Get all files for the authenticated user
app.get('/', async (c) => {
  const authError = await requireAuth(c)
  if (authError) return authError

  const auth = getAuth(c)

  try {
    const userFiles = await db
      .select()
      .from(files)
      .where(eq(files.userId, auth.userId!))
      .orderBy(files.updatedAt)

    return c.json(userFiles)
  } catch (error) {
    console.error('Error fetching files:', error)
    return c.json({ error: 'Failed to fetch files' }, 500)
  }
})

// Get a single file
app.get('/:id', async (c) => {
  const authError = await requireAuth(c)
  if (authError) return authError

  const auth = getAuth(c)
  const { id } = c.req.param()

  try {
    const file = await db.query.files.findFirst({
      where: and(
        eq(files.id, id),
        eq(files.userId, auth.userId!)
      ),
    })

    if (!file) {
      return c.json({ error: 'File not found' }, 404)
    }

    return c.json(file)
  } catch (error) {
    console.error('Error fetching file:', error)
    return c.json({ error: 'Failed to fetch file' }, 500)
  }
})

// Create a new file
app.post('/', async (c) => {
  const authError = await requireAuth(c)
  if (authError) return authError

  const auth = getAuth(c)

  try {
    const body = await c.req.json<CreateFileInput>()

    // Ensure user exists in database
    await db
      .insert(users)
      .values({
        id: auth.userId!,
        email: auth.sessionClaims?.email as string || '',
      })
      .onConflictDoNothing()

    // Create the file
    const [newFile] = await db
      .insert(files)
      .values({
        userId: auth.userId!,
        name: body.name,
        content: body.content || '',
      })
      .returning()

    return c.json(newFile, 201)
  } catch (error) {
    console.error('Error creating file:', error)
    return c.json({ error: 'Failed to create file' }, 500)
  }
})

// Update a file
app.put('/:id', async (c) => {
  const authError = await requireAuth(c)
  if (authError) return authError

  const auth = getAuth(c)
  const { id } = c.req.param()

  try {
    const body = await c.req.json<UpdateFileInput>()

    // Verify ownership
    const existingFile = await db.query.files.findFirst({
      where: and(
        eq(files.id, id),
        eq(files.userId, auth.userId!)
      ),
    })

    if (!existingFile) {
      return c.json({ error: 'File not found' }, 404)
    }

    // Update the file
    const [updatedFile] = await db
      .update(files)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(files.id, id))
      .returning()

    return c.json(updatedFile)
  } catch (error) {
    console.error('Error updating file:', error)
    return c.json({ error: 'Failed to update file' }, 500)
  }
})

// Delete a file
app.delete('/:id', async (c) => {
  const authError = await requireAuth(c)
  if (authError) return authError

  const auth = getAuth(c)
  const { id } = c.req.param()

  try {
    // Verify ownership
    const existingFile = await db.query.files.findFirst({
      where: and(
        eq(files.id, id),
        eq(files.userId, auth.userId!)
      ),
    })

    if (!existingFile) {
      return c.json({ error: 'File not found' }, 404)
    }

    // Delete the file (shares will be cascade deleted)
    await db.delete(files).where(eq(files.id, id))

    return c.json({ success: true })
  } catch (error) {
    console.error('Error deleting file:', error)
    return c.json({ error: 'Failed to delete file' }, 500)
  }
})

export default app
