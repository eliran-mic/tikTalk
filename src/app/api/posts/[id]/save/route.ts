import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'

// POST /api/posts/[id]/save — save post to a collection (creates default "Saved" if none specified)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: postId } = await params

  // Verify post exists
  const post = await prisma.post.findUnique({ where: { id: postId } })
  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    // No body is fine — use default collection
  }

  const collectionId = typeof body.collectionId === 'string' ? body.collectionId : null

  // Get or create the target collection
  let targetCollectionId: string
  if (collectionId) {
    const collection = await prisma.collection.findFirst({
      where: { id: collectionId, userId: user.id },
    })
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }
    targetCollectionId = collectionId
  } else {
    // Use or create default "Saved" collection
    let savedCollection = await prisma.collection.findFirst({
      where: { userId: user.id, name: 'Saved' },
    })

    if (!savedCollection) {
      savedCollection = await prisma.collection.create({
        data: { name: 'Saved', userId: user.id },
      })
    }
    targetCollectionId = savedCollection.id
  }

  // Check if already saved
  const existing = await prisma.collectionItem.findUnique({
    where: { collectionId_postId: { collectionId: targetCollectionId, postId } },
  })

  if (existing) {
    // Unsave — remove from collection
    await prisma.collectionItem.delete({ where: { id: existing.id } })
    return NextResponse.json({ saved: false })
  }

  // Save to collection
  await prisma.collectionItem.create({
    data: { collectionId: targetCollectionId, postId },
  })

  return NextResponse.json({ saved: true }, { status: 201 })
}
