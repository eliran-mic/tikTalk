import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

// Map agent names to distinct OpenAI TTS voices
const AGENT_VOICE_MAP: Record<string, 'alloy' | 'echo' | 'fable' | 'onyx'> = {
  'Marcus the Stoic Tech Bro': 'onyx',
  'Lila the Dharma Teacher': 'fable',
  'Nova the Futurist': 'alloy',
  'Sage the Business Mystic': 'echo',
}

/**
 * POST /api/tts
 *
 * Accepts { text, agentName } and returns mp3 audio via OpenAI TTS.
 * Falls back to 400 if OPENAI_API_KEY is not set.
 */
export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: 'OPENAI_API_KEY is not configured' },
      { status: 400 }
    )
  }

  let text: string
  let agentName: string

  try {
    const body = await request.json()
    text = body.text
    agentName = body.agentName
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!text || typeof text !== 'string') {
    return Response.json({ error: 'text is required' }, { status: 400 })
  }

  const voice = AGENT_VOICE_MAP[agentName] ?? 'alloy'

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1',
      voice,
      input: text,
    })

    const arrayBuffer = await mp3Response.arrayBuffer()

    return new Response(arrayBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': String(arrayBuffer.byteLength),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'TTS generation failed'
    return Response.json({ error: message }, { status: 500 })
  }
}
