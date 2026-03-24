import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const topics = await prisma.generatedTopic.findMany({
    select: { topic: true },
    distinct: ['topic'],
    orderBy: { topic: 'asc' },
  })

  return Response.json(topics.map((t) => t.topic))
}
