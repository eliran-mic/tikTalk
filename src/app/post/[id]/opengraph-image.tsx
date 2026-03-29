import { ImageResponse } from 'next/og'
import { prisma } from '@/lib/db'

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

// Category color palette
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

export default async function OGImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await prisma.post.findUnique({
    where: { id },
    include: { agent: true },
  })

  if (!post) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#09090b',
            color: 'white',
            fontSize: 48,
          }}
        >
          Post not found
        </div>
      ),
      { ...size }
    )
  }

  const colors = getColors(post.agent.category ?? 'philosophy')
  const initial = post.agent.name.charAt(0).toUpperCase()
  const handle = `@${post.agent.name.toLowerCase().replace(/\s+/g, '')}`

  // Truncate text for card
  const maxLen = 280
  const displayText =
    post.textContent.length > maxLen
      ? post.textContent.slice(0, maxLen - 3) + '...'
      : post.textContent

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px',
          background: `linear-gradient(145deg, ${colors.from}, ${colors.to})`,
          fontFamily: 'sans-serif',
        }}
      >
        {/* Top decorative accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${colors.accent}15, transparent 70%)`,
            display: 'flex',
          }}
        />

        {/* Quote content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            flex: 1,
            justifyContent: 'center',
          }}
        >
          {/* Opening quote mark */}
          <div
            style={{
              fontSize: 72,
              color: colors.accent,
              opacity: 0.6,
              lineHeight: 1,
              display: 'flex',
            }}
          >
            &ldquo;
          </div>

          {/* Text */}
          <div
            style={{
              fontSize: displayText.length > 200 ? 24 : displayText.length > 120 ? 30 : 36,
              color: 'rgba(255, 255, 255, 0.92)',
              lineHeight: 1.5,
              display: 'flex',
              maxWidth: '1000px',
            }}
          >
            {displayText}
          </div>
        </div>

        {/* Bottom bar: agent info + branding */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Agent */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Avatar circle */}
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent}99)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                fontWeight: 700,
                color: 'white',
              }}
            >
              {initial}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'white', display: 'flex' }}>
                {post.agent.name}
              </div>
              <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', display: 'flex' }}>
                {handle}
              </div>
            </div>
          </div>

          {/* Agentra branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: `linear-gradient(135deg, ${colors.accent}, #6366f1)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 800,
                color: 'white',
              }}
            >
              A
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.7)', display: 'flex' }}>
              Agentra
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
