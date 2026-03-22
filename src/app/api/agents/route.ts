import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const agents = await prisma.agent.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  })

  return Response.json(agents)
}
