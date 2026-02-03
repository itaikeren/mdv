import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { db } from '../db/client.js'
import { comments, shares, users } from '../db/schema.js'
import { requireAuth } from '../middleware/auth.js'
import type { CreateCommentInput } from '@markdown-viewer/shared'

const app = new Hono()

// Get all comments for a share (public - always returns comments for read-only display)
app.get('/:shareId', async (c) => {
  const { shareId } = c.req.param()

  try {
    const share = await db.query.shares.findFirst({
      where: eq(shares.id, shareId),
    })

    if (!share) {
      return c.json({ error: 'Share not found' }, 404)
    }

    const shareComments = await db
      .select()
      .from(comments)
      .where(eq(comments.shareId, shareId))

    return c.json(shareComments)
  } catch (error) {
    console.error('Error fetching comments:', error)
    return c.json({ error: 'Failed to fetch comments' }, 500)
  }
})

// Create a comment (auth required)
app.post('/', async (c) => {
  const { error, auth } = await requireAuth(c)
  if (error) return error

  try {
    const body = await c.req.json<CreateCommentInput>()

    // Validate content length
    if (!body.content || body.content.trim().length === 0) {
      return c.json({ error: 'Comment content is required' }, 400)
    }
    if (body.content.length > 2000) {
      return c.json({ error: 'Comment must be 2000 characters or less' }, 400)
    }

    // Verify share exists and comments are enabled
    const share = await db.query.shares.findFirst({
      where: eq(shares.id, body.shareId),
    })

    if (!share) {
      return c.json({ error: 'Share not found' }, 404)
    }

    if (!share.commentsEnabled) {
      return c.json({ error: 'Comments are disabled for this share' }, 403)
    }

    // If replying, validate parent is a top-level comment (no nested replies)
    if (body.parentId) {
      const parentComment = await db.query.comments.findFirst({
        where: and(
          eq(comments.id, body.parentId),
          eq(comments.shareId, body.shareId),
        ),
      })

      if (!parentComment) {
        return c.json({ error: 'Parent comment not found' }, 404)
      }

      if (parentComment.parentId !== null) {
        return c.json({ error: 'Cannot reply to a reply' }, 400)
      }
    }

    // Get user email via Clerk client (the DB may have stale/empty email)
    const clerkClient = c.get('clerk')
    const clerkUser = await clerkClient.users.getUser(auth.userId)
    const userEmail = clerkUser.emailAddresses[0]?.emailAddress || 'unknown'

    // Ensure user exists in DB with up-to-date email
    await db
      .insert(users)
      .values({ id: auth.userId, email: userEmail })
      .onConflictDoNothing()

    const [newComment] = await db
      .insert(comments)
      .values({
        shareId: body.shareId,
        userId: auth.userId,
        userEmail,
        content: body.content.trim(),
        parentId: body.parentId ?? null,
      })
      .returning()

    return c.json(newComment, 201)
  } catch (error) {
    console.error('Error creating comment:', error)
    return c.json({ error: 'Failed to create comment' }, 500)
  }
})

// Delete a comment (own comment or file owner)
app.delete('/:id', async (c) => {
  const { error, auth } = await requireAuth(c)
  if (error) return error

  const { id } = c.req.param()

  try {
    // Get the comment with share and file info
    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, id),
      with: {
        share: {
          with: {
            file: true,
          },
        },
      },
    })

    if (!comment) {
      return c.json({ error: 'Comment not found' }, 404)
    }

    // Allow deletion if user owns the comment OR owns the file
    const isCommentOwner = comment.userId === auth.userId
    const isFileOwner = comment.share.file.userId === auth.userId

    if (!isCommentOwner && !isFileOwner) {
      return c.json({ error: 'Unauthorized' }, 403)
    }

    await db.delete(comments).where(eq(comments.id, id))

    return c.json({ success: true })
  } catch (error) {
    console.error('Error deleting comment:', error)
    return c.json({ error: 'Failed to delete comment' }, 500)
  }
})

export default app
