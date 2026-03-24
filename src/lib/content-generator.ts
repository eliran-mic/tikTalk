import { prisma } from '@/lib/db'
import { generateTTSDataUri } from '@/lib/tts'
import {
  createGenerationLogger,
  type GenerationMetrics,
} from '@/lib/generation-logger'
import { moderateContent, type ModerationStatus } from '@/lib/moderation'

// Content styles for varied generation
const CONTENT_STYLES = [
  'quote',
  'mini-essay',
  'list',
  'story',
  'question-and-answer',
] as const

type ContentStyle = (typeof CONTENT_STYLES)[number]

function pickRandomStyle(): ContentStyle {
  return CONTENT_STYLES[Math.floor(Math.random() * CONTENT_STYLES.length)]
}

function getStyleInstruction(style: ContentStyle): string {
  switch (style) {
    case 'quote':
      return 'Write this as a powerful quote or aphorism followed by a brief (2-3 sentence) reflection on its meaning. The quote should feel original, not a famous existing quote.'
    case 'mini-essay':
      return 'Write this as a cohesive mini-essay with a clear opening hook, a developed middle, and a memorable closing insight.'
    case 'list':
      return 'Write this as a short intro (1-2 sentences) followed by a list of 3-5 bullet points, each with a brief explanation. End with a one-sentence takeaway.'
    case 'story':
      return 'Write this as a brief story or anecdote — real or illustrative — that reveals the insight through narrative rather than direct instruction. Show, don\'t just tell.'
    case 'question-and-answer':
      return 'Write this as a thought-provoking question followed by a nuanced answer that explores multiple angles. The question should feel like something the audience actually wonders about.'
  }
}

// Expanded topic pools per domain (agent persona) — 30+ each
const TOPIC_POOLS: Record<string, string[]> = {
  stoic: [
    'dealing with change',
    'finding focus in a distracted world',
    'the power of small daily habits',
    'why failure is your greatest teacher',
    'the art of letting go',
    'managing anger in the moment',
    'embracing discomfort as growth',
    'the discipline of saying no',
    'ego and the engineering mindset',
    'burnout recovery through philosophy',
    'imposter syndrome and self-worth',
    'building resilience after layoffs',
    'the obstacle is the way',
    'journaling as a debugging tool for the mind',
    'toxic hustle culture and what Seneca would say',
    'comparing yourself to others on social media',
    'the Stoic approach to difficult coworkers',
    'morning routines that Marcus Aurelius would approve',
    'death meditation and living with urgency',
    'accepting what you cannot control at work',
    'how gratitude rewires your default mode',
    'the trap of perfectionism in code and life',
    'negative visualization as a productivity tool',
    'the dichotomy of control in career planning',
    'Epictetus on handling criticism in code reviews',
    'voluntary discomfort and cold exposure for engineers',
    'Seneca on the shortness of life and time management',
    'the Stoic practice of the view from above',
    'premeditatio malorum for project planning',
    'why character matters more than compensation',
    'the inner citadel when your startup fails',
    'amor fati and embracing on-call rotations',
  ],
  mindfulness: [
    'being present during mundane tasks',
    'finding peace in uncertainty',
    'the beauty of impermanence',
    'compassion for yourself on hard days',
    'the middle way in modern life',
    'mindful eating in a fast-food world',
    'letting go of the need to be right',
    'the space between stimulus and response',
    'walking meditation for busy people',
    'digital detox and mindful scrolling',
    'loving-kindness for difficult people',
    'the practice of non-attachment',
    'finding stillness in chaos',
    "beginner's mind in everyday life",
    'the wisdom of doing nothing',
    'body scan for stress relief',
    'gratitude as a daily practice',
    'mindful breathing at your desk',
    'the illusion of multitasking',
    'accepting difficult emotions',
    'interdependence and connection',
    'the art of truly listening',
    'noting practice for anxious thoughts',
    'rain technique for emotional overwhelm',
    'tonglen practice for empathy building',
    'the five hindrances in daily life',
    'equanimity when things fall apart',
    'mindful communication in conflict',
    'the three characteristics of existence',
    'practicing patience in a same-day-delivery world',
    'the art of pausing before reacting',
    'cultivating joy for others success',
  ],
  futurism: [
    'breakthroughs in renewable energy',
    'the future of personalized medicine',
    'how AI is accelerating scientific discovery',
    'the next decade of space exploration',
    'longevity research and extending healthspan',
    'quantum computing breakthroughs',
    'the convergence of AI and biotechnology',
    'self-driving vehicles and urban transformation',
    'brain-computer interfaces and human potential',
    'lab-grown meat and the future of food',
    'nuclear fusion progress',
    'CRISPR and gene editing breakthroughs',
    'the rise of vertical farming',
    'advanced materials changing manufacturing',
    'robotics in healthcare',
    'decentralized energy grids',
    'the democratization of satellite technology',
    'AR glasses replacing smartphones',
    'climate tech solutions that are working',
    'the future of education with AI tutors',
    'synthetic biology creating new materials',
    'ocean cleanup and environmental tech',
    'neuromorphic computing and brain-inspired chips',
    'the hydrogen economy and green fuel cells',
    'digital twins revolutionizing city planning',
    'programmable matter and shape-shifting materials',
    'the end of antibiotics and phage therapy',
    'asteroid mining and space resources',
    'closed-loop recycling and zero-waste manufacturing',
    'artificial photosynthesis and carbon capture',
    'the future of work in an AI-augmented world',
    'precision fermentation replacing animal agriculture',
  ],
  business: [
    'why your pricing problem is a self-worth problem',
    'the shadow side of leadership',
    'founder burnout and the myth of hustle',
    'hiring for values not just skills',
    'the psychology of product-market fit',
    'building a company culture intentionally',
    'the art of the pivot without losing your identity',
    'fundraising as a mirror of your relationship with money',
    'why great founders do inner work',
    'the lone genius myth vs collaborative innovation',
    'decision fatigue and CEO mental health',
    "the power of saying I don't know",
    'building trust in remote teams',
    'the Jungian shadow in organizational dynamics',
    'maslow hierarchy applied to startup stages',
    'the courage to fire your biggest client',
    'strategic patience in a growth-obsessed market',
    'vulnerability as a leadership superpower',
    'the founder-therapist paradox',
    'revenue plateaus as invitations for transformation',
    'authentic marketing vs performative branding',
    'when to bootstrap vs when to raise',
    'the sunk cost fallacy in product decisions',
    'building an advisory board that actually advises',
    'the first 90 days as a new leader',
    'customer empathy as competitive advantage',
    'the myth of the overnight success',
    'psychologically safe teams and innovation velocity',
    'navigating co-founder conflict with radical candor',
    'the art of strategic storytelling for fundraising',
    'why most mission statements fail and what works instead',
    'building resilience through antifragile business models',
  ],
}

// Map agent names to their topic domain
const AGENT_DOMAIN_MAP: Record<string, string> = {
  'Marcus the Stoic Tech Bro': 'stoic',
  'Lila the Dharma Teacher': 'mindfulness',
  'Nova the Futurist': 'futurism',
  'Sage the Business Mystic': 'business',
}

// Enhanced system prompt additions per agent for higher quality, more varied output
const AGENT_SYSTEM_PROMPT_ENHANCEMENTS: Record<string, string> = {
  'Marcus the Stoic Tech Bro': `

Additional guidelines for quality:
- Vary your opening — sometimes start with a personal anecdote, sometimes with a Stoic quote, sometimes with a provocative question
- Use specific, vivid details (name real frameworks, real companies, real Stoic texts)
- Avoid cliches like "at the end of the day" or "it's all about perspective"
- Each piece should feel like it could stand alone as a memorable insight someone would screenshot and share`,

  'Lila the Dharma Teacher': `

Additional guidelines for quality:
- Ground every piece in sensory detail — what you saw, heard, felt, tasted
- Vary the Buddhist traditions you draw from: Zen, Theravada, Tibetan, secular mindfulness
- Avoid spiritual bypassing — acknowledge real pain before offering the teaching
- Make micro-practices ultra-specific: exactly how many breaths, exactly what to notice, exactly what words to say silently`,

  'Nova the Futurist': `

Additional guidelines for quality:
- Lead with the most surprising or counterintuitive fact
- Be specific with numbers: costs, timelines, percentages, comparisons to previous decades
- Connect breakthroughs to what they mean for a regular person, not just the industry
- Acknowledge legitimate concerns (safety, equity, access) without losing your fundamental optimism
- Avoid hollow hype — ground your excitement in actual data and published research`,

  'Sage the Business Mystic': `

Additional guidelines for quality:
- Open with a moment of tension: a founder in crisis, a decision point, a paradox
- Make the psychological insight genuinely surprising — not just "believe in yourself"
- Be specific about business mechanics (ARR, churn, CAC) alongside the inner work
- Your anonymized stories should feel real and specific, even if the details are changed
- Every piece should leave the reader seeing a familiar business problem in a completely new way`,
}

function generateMockContent(agentName: string, topic: string): string {
  const mockContent: Record<string, string> = {
    'Marcus the Stoic Tech Bro': `Let me tell you something about ${topic} that Marcus Aurelius figured out 2,000 years ago — and that most engineers still haven't learned.\n\nWe spend so much time optimizing our systems, refactoring our code, and automating our deploys. But when it comes to our own minds? We're running spaghetti code from childhood.\n\nThe Stoics had a framework for ${topic}: focus only on what you can control. Your PRs, your effort, your response to that passive-aggressive Slack message — that's in your control. The reorg, the layoffs, the market — that's not.\n\nHere's your daily standup for the soul: Before you open your laptop tomorrow, spend 60 seconds asking yourself — "What's in my control today?" Then let the rest compile in the background.`,

    'Lila the Dharma Teacher': `I was making tea this morning when I noticed something about ${topic}.\n\nThe water was boiling — chaotic, turbulent, noisy. And then I poured it into the cup, and slowly... it became still. The tea leaves settled. The warmth spread through my hands.\n\nThis is what the Buddha was pointing to when he talked about ${topic}. Not forcing stillness, but creating the conditions for it to arise naturally.\n\nYou don't have to fix everything right now. You don't have to have it all figured out.\n\nTry this: Right now, wherever you are, take three slow breaths. On each exhale, silently say "settling." Feel yourself becoming like that cup of tea — still warm, still alive, but no longer turbulent.\n\nThat's enough. That's the whole practice.`,

    'Nova the Futurist': `OK, this is going to blow your mind about ${topic}.\n\nResearchers just published data showing we're approaching an inflection point that most people aren't even tracking. In the next 18-24 months, the convergence of AI, biotechnology, and advanced materials is going to fundamentally reshape how we think about ${topic}.\n\nHere's what's happening: computing costs have dropped 10,000x in the last decade. That means problems we couldn't even attempt to solve five years ago are now tractable. We're not just making progress — we're making progress on the rate of progress.\n\nThe naysayers will tell you to be cynical. The data says otherwise. Every major metric of human wellbeing is trending in the right direction, and the tools we're building right now will accelerate that curve.\n\nThe future isn't something that happens to you. It's something we're building together. And it's going to be extraordinary.`,

    'Sage the Business Mystic': `I had a founder call me last week, panicking about ${topic}. Revenue was flat. The board was restless. They couldn't sleep.\n\nI asked one question: "When did you stop trusting yourself?"\n\nSilence.\n\nHere's what I've learned advising startups through every stage: ${topic} is never just a business problem. It's a mirror. The company reflects the founder's inner state with brutal accuracy.\n\nJung called this the shadow — the parts of ourselves we refuse to see. In business, your shadow shows up as the hire you won't make, the pivot you won't take, the conversation you keep avoiding.\n\nThis week, try this: Write down the one thing in your business you keep avoiding. Then ask yourself — "What am I afraid this says about me?" That's where the real work begins.\n\nYour business can only grow as fast as you do.`,
  }

  return (
    mockContent[agentName] ||
    `A thoughtful reflection on ${topic} from ${agentName}.\n\nThis is placeholder content that would normally be generated by the Anthropic API. The content would be written in the unique voice and style of ${agentName}, exploring the topic of ${topic} in a way that's engaging, insightful, and about 30-60 seconds to read.`
  )
}

const MIN_CONTENT_LENGTH = 50
const MAX_CONTENT_LENGTH = 2000
const MAX_GENERATION_RETRIES = 3
const MAX_RATE_LIMIT_RETRIES = 3
const MAX_MODERATION_RETRIES = 2

function isValidContent(text: string): boolean {
  const trimmed = text.trim()
  return (
    trimmed.length >= MIN_CONTENT_LENGTH &&
    trimmed.length <= MAX_CONTENT_LENGTH
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRateLimitError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'status' in error) {
    return (error as { status: number }).status === 429
  }
  return false
}

/**
 * Generate content via Anthropic API with content validation retries
 * and exponential backoff for rate limits.
 */
async function generateWithAnthropic(
  systemPrompt: string,
  topic: string,
  style: ContentStyle
): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic()

  const styleInstruction = getStyleInstruction(style)

  for (let attempt = 0; attempt < MAX_GENERATION_RETRIES; attempt++) {
    // Rate limit retry loop
    let rateLimitRetries = 0
    let message
    while (rateLimitRetries <= MAX_RATE_LIMIT_RETRIES) {
      try {
        message = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: `Write a short-form script (30-60 second read, roughly 100-180 words) about: ${topic}.\n\nStyle: ${style}. ${styleInstruction}\n\nWrite ONLY the script text — no titles, no stage directions, no metadata. Just the words as they would be spoken or read.`,
            },
          ],
        })
        break
      } catch (error) {
        if (
          isRateLimitError(error) &&
          rateLimitRetries < MAX_RATE_LIMIT_RETRIES
        ) {
          rateLimitRetries++
          const backoffMs = Math.pow(2, rateLimitRetries) * 1000
          console.log(
            JSON.stringify({
              event: 'rate_limit_backoff',
              attempt: rateLimitRetries,
              backoffMs,
              timestamp: new Date().toISOString(),
            })
          )
          await sleep(backoffMs)
          continue
        }
        throw error
      }
    }

    if (!message) {
      throw new Error(
        'Failed to get response from Anthropic API after rate limit retries'
      )
    }

    const textBlock = message.content.find((block) => block.type === 'text')
    const text = textBlock?.text ?? ''

    if (isValidContent(text)) {
      return text
    }

    console.log(
      JSON.stringify({
        event: 'content_validation_failed',
        attempt: attempt + 1,
        contentLength: text.trim().length,
        timestamp: new Date().toISOString(),
      })
    )
  }

  throw new Error(
    `Content failed validation after ${MAX_GENERATION_RETRIES} attempts`
  )
}

/**
 * Get unused topics for an agent from their domain's topic pool.
 * Returns topics the agent hasn't covered yet.
 */
async function getAvailableTopics(
  agentId: string,
  domain: string
): Promise<string[]> {
  const pool = TOPIC_POOLS[domain]
  if (!pool) return []

  const usedTopics = await prisma.generatedTopic.findMany({
    where: { agentId },
    select: { topic: true },
  })

  const usedSet = new Set(usedTopics.map((t) => t.topic))
  const available = pool.filter((topic) => !usedSet.has(topic))

  // If all topics used, reset by clearing the agent's topic history
  if (available.length === 0) {
    await prisma.generatedTopic.deleteMany({ where: { agentId } })
    return pool
  }

  return available
}

/**
 * Pick N random topics from an array without repeats.
 */
function pickRandomTopics(topics: string[], count: number): string[] {
  const shuffled = [...topics].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

export interface GenerationResult {
  agentName: string
  postsCreated: number
  topics: string[]
}

/**
 * Generate content for all agents.
 * Each agent produces 2-3 posts per run with varied, non-repeating topics.
 * Returns results and generation metrics.
 */
export async function generateContentForAllAgents(): Promise<{
  results: GenerationResult[]
  metrics: GenerationMetrics
}> {
  const logger = createGenerationLogger()
  const agents = await prisma.agent.findMany()

  if (agents.length === 0) {
    throw new Error(
      'No agents found in the database. Run the seed script first.'
    )
  }

  const hasApiKey = !!process.env.ANTHROPIC_API_KEY
  const results: GenerationResult[] = []

  for (const agent of agents) {
    const domain = AGENT_DOMAIN_MAP[agent.name] ?? 'stoic'
    const availableTopics = await getAvailableTopics(agent.id, domain)
    const postsPerRun = 2 + Math.floor(Math.random() * 2) // 2-3 posts
    const selectedTopics = pickRandomTopics(availableTopics, postsPerRun)

    const agentResult: GenerationResult = {
      agentName: agent.name,
      postsCreated: 0,
      topics: [],
    }

    for (const topic of selectedTopics) {
      let textContent = ''
      let moderationStatus: ModerationStatus = 'approved'

      logger.logAttempt(agent.name)

      if (hasApiKey) {
        const enhancement =
          AGENT_SYSTEM_PROMPT_ENHANCEMENTS[agent.name] ?? ''
        const enhancedPrompt = agent.systemPrompt + enhancement

        let generated = false
        for (
          let modAttempt = 0;
          modAttempt <= MAX_MODERATION_RETRIES;
          modAttempt++
        ) {
          const style = pickRandomStyle()
          try {
            textContent = await generateWithAnthropic(
              enhancedPrompt,
              topic,
              style
            )
          } catch (error) {
            const errMsg =
              error instanceof Error ? error.message : 'Unknown error'
            logger.logFailure(agent.name, errMsg)
            logger.logFallback(agent.name, errMsg)
            textContent = generateMockContent(agent.name, topic)
            // Mock content is pre-vetted, skip moderation
            generated = true
            break
          }

          const modResult = moderateContent(textContent, topic)
          if (modResult.status === 'approved') {
            generated = true
            logger.logSuccess(agent.name)
            break
          }

          // Last attempt failed moderation — save as rejected
          if (modAttempt === MAX_MODERATION_RETRIES) {
            moderationStatus = 'rejected'
            generated = true
            logger.logSuccess(agent.name)
          }
        }

        if (!generated) {
          textContent = generateMockContent(agent.name, topic)
        }
      } else {
        logger.logFallback(agent.name, 'No ANTHROPIC_API_KEY')
        textContent = generateMockContent(agent.name, topic)
      }

      // Only generate TTS for approved content
      let audioUrl = '/audio/placeholder.mp3'
      if (moderationStatus === 'approved') {
        try {
          const dataUri = await generateTTSDataUri(textContent, agent.name)
          if (dataUri) audioUrl = dataUri
        } catch {
          // TTS failed — keep placeholder
        }
      }

      await prisma.post.create({
        data: {
          textContent,
          audioUrl,
          imageUrl: '/images/placeholder.png',
          agentId: agent.id,
          moderationStatus,
        },
      })

      // Record the topic as used
      await prisma.generatedTopic.create({
        data: {
          topic,
          agentId: agent.id,
        },
      })

      if (moderationStatus === 'approved') {
        agentResult.postsCreated++
      }
      agentResult.topics.push(topic)
    }

    results.push(agentResult)
  }

  return { results, metrics: logger.getMetrics() }
}
