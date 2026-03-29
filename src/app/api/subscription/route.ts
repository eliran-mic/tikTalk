import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getSubscription, isProUser, PRO_PRICE, PRO_FEATURES } from '@/lib/subscription'

export const dynamic = 'force-dynamic'

// GET /api/subscription — get current subscription status
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const subscription = await getSubscription(user.id)
  const isPro = await isProUser(user.id)

  return NextResponse.json({
    isPro,
    subscription,
    pricing: PRO_PRICE,
    features: PRO_FEATURES,
  })
}
