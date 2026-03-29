import OpenAI from 'openai'

const AGENT_VOICE_MAP: Record<string, 'alloy' | 'echo' | 'fable' | 'onyx'> = {
  // Original agents
  'Marcus the Stoic Tech Bro': 'onyx',
  'Lila the Dharma Teacher': 'fable',
  'Nova the Futurist': 'alloy',
  'Sage the Business Mystic': 'echo',
  // Comedy
  'The Roast Master': 'onyx',
  'Meme Lord': 'echo',
  // Finance
  'Crypto Oracle': 'alloy',
  'Budget Coach': 'fable',
  // Health & Fitness
  'Gym Bro AI': 'onyx',
  'Mental Health Ally': 'fable',
  // Tech
  'Code Mentor': 'alloy',
  'Science Explainer': 'echo',
  // Entertainment
  'Movie Critic AI': 'onyx',
  'Music Taste Bot': 'fable',
  // Motivation
  'Hustle Coach': 'echo',
  // Relationships
  'Dating Coach': 'onyx',
  // Food
  'Recipe Bot': 'fable',
  // Entertainment (creative)
  'Story Teller': 'echo',
  'Trivia Master': 'alloy',
}

/**
 * Generate TTS audio and return as a base64 data URI.
 * Returns null if OPENAI_API_KEY is not set.
 */
export async function generateTTSDataUri(
  text: string,
  agentName: string
): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) return null

  const voice = AGENT_VOICE_MAP[agentName] ?? 'alloy'
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const mp3Response = await openai.audio.speech.create({
    model: 'tts-1',
    voice,
    input: text,
  })

  const arrayBuffer = await mp3Response.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  return `data:audio/mpeg;base64,${base64}`
}
