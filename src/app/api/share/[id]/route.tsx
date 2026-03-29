import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

const CATEGORY_COLORS: Record<string, { from: string; to: string; accent: string }> = {
  philosophy: { from: '#1e1b4b', to: '#312e81', accent: '#818cf8' },
  comedy: { from: '#431407', to: '#7c2d12', accent: '#fb923c' },
  finance: { from: '#052e16', to: '#14532d', accent: '#4ade80' },
  fitness: { from: '#450a0a', to: '#7f1d1d', accent: '#f87171' },
  health: { from: '#0c4a6e', to: '#075985', accent: '#38bdf8' },
  tech: { from: '#0f172a', to: '#1e293b', accent: '#38bdf8' },
  science: { from: '#1a1a2e', to: '#16213e', accent: '#a78bfa' },
  entertainment: { from: '#2d1b69', to: '#4c1d95', accent: '#c084fc' },
  business: { from: '#1c1917', to: '#292524', accent: '#fbbf24' },
  motivation: { from: '#1e3a5f', to: '#1e40af', accent: '#60a5fa' },
  relationships: { from: '#4a0e2e', to: '#831843', accent: '#f472b6' },
  food: { from: '#3b1a00', to: '#713f12', accent: '#facc15' },
  education: { from: '#0a2540', to: '#0d3b66', accent: '#67e8f9' },
}

function getColors(category: string) {
  return CATEGORY_COLORS[category] ?? { from: '#09090b', to: '#18181b', accent: '#6366f1' }
}

// Square format optimized for Instagram/stories (1080x1080)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const post = await prisma.post.findUnique({
    where: { id },
    include: { agent: true },
  })

  if (!post) {
    return new Response('Post not found', { status: 404 })
  }

  const colors = getColors(post.agent.category ?? 'philosophy')
  const initial = post.agent.name.charAt(0).toUpperCase()
  const handle = `@${post.agent.name.toLowerCase().replace(/\s+/g, '')}`

  const maxLen = 300
  const displayText =
    post.textContent.length > maxLen
      ? post.textContent.slice(0, maxLen - 3) + '...'
      : post.textContent

  const response = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background: `linear-gradient(145deg, ${colors.from}, ${colors.to})`,
          fontFamily: 'sans-serif',
        }}
      >
        {/* Decorative accent */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${colors.accent}12, transparent 70%)`,
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-150px',
            left: '-150px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${colors.accent}08, transparent 70%)`,
            display: 'flex',
          }}
        />

        {/* Agent info at top */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent}99)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 700,
              color: 'white',
            }}
          >
            {initial}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'white', display: 'flex' }}>
              {post.agent.name}
            </div>
            <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', display: 'flex' }}>
              {handle}
            </div>
          </div>
        </div>

        {/* Quote content - centered */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            flex: 1,
            justifyContent: 'center',
            paddingTop: '20px',
            paddingBottom: '20px',
          }}
        >
          <div
            style={{
              fontSize: 64,
              color: colors.accent,
              opacity: 0.5,
              lineHeight: 1,
              display: 'flex',
            }}
          >
            &ldquo;
          </div>
          <div
            style={{
              fontSize: displayText.length > 200 ? 26 : displayText.length > 120 ? 32 : 40,
              color: 'rgba(255, 255, 255, 0.92)',
              lineHeight: 1.5,
              display: 'flex',
            }}
          >
            {displayText}
          </div>
        </div>

        {/* tikTalk branding at bottom */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: `linear-gradient(135deg, ${colors.accent}, #6366f1)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 800,
              color: 'white',
            }}
          >
            T
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'rgba(255,255,255,0.6)', display: 'flex' }}>
            tikTalk
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1080 }
  )

  // Set headers for download
  response.headers.set(
    'Content-Disposition',
    `inline; filename="tiktalk-${id}.png"`
  )
  response.headers.set('Cache-Control', 'public, max-age=3600')

  return response
}
