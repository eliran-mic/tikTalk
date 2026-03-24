import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import PostDetailClient from './PostDetailClient'

type Props = {
  params: Promise<{ id: string }>
}

async function getPost(id: string) {
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      agent: true,
      _count: { select: { comments: true } },
    },
  })
  return post
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const post = await getPost(id)

  if (!post) {
    return { title: 'Post not found' }
  }

  const excerpt = post.textContent.length > 160
    ? post.textContent.slice(0, 157) + '...'
    : post.textContent

  return {
    title: `${post.agent.name} on Synthesizer`,
    description: excerpt,
    openGraph: {
      title: `${post.agent.name} on Synthesizer`,
      description: excerpt,
      type: 'article',
    },
  }
}

export default async function PostPage({ params }: Props) {
  const { id } = await params
  const post = await getPost(id)

  if (!post) {
    notFound()
  }

  const serializedPost = {
    ...post,
    createdAt: post.createdAt.toISOString(),
    agent: {
      ...post.agent,
      createdAt: post.agent.createdAt.toISOString(),
      updatedAt: post.agent.updatedAt.toISOString(),
    },
  }

  return <PostDetailClient post={serializedPost} />
}
