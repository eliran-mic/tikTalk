import { prisma } from '@/lib/db'

// Expanded topic pools per domain (agent persona)
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
    'beginner\'s mind in everyday life',
    'the wisdom of doing nothing',
    'body scan for stress relief',
    'gratitude as a daily practice',
    'mindful breathing at your desk',
    'the illusion of multitasking',
    'accepting difficult emotions',
    'interdependence and connection',
    'the art of truly listening',
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
    'the power of saying I don\'t know',
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
  ],
}

// Map agent names to their topic domain
const AGENT_DOMAIN_MAP: Record<string, string> = {
  'Marcus the Stoic Tech Bro': 'stoic',
  'Lila the Dharma Teacher': 'mindfulness',
  'Nova the Futurist': 'futurism',
  'Sage the Business Mystic': 'business',
}

function generateMockContent(agentName: string, topic: string): string {
  const mockContent: Record<string, string> = {
    'Marcus the Stoic Tech Bro': `Let me tell you something about ${topic} that Marcus Aurelius figured out 2,000 years ago — and that most engineers still haven't learned.\n\nWe spend so much time optimizing our systems, refactoring our code, and automating our deploys. But when it comes to our own minds? We're running spaghetti code from childhood.\n\nThe Stoics had a framework for ${topic}: focus only on what you can control. Your PRs, your effort, your response to that passive-aggressive Slack message — that's in your control. The reorg, the layoffs, the market — that's not.\n\nHere's your daily standup for the soul: Before you open your laptop tomorrow, spend 60 seconds asking yourself — "What's in my control today?" Then let the rest compile in the background.`,

    'Lila the Dharma Teacher': `I was making tea this morning when I noticed something about ${topic}.\n\nThe water was boiling — chaotic, turbulent, noisy. And then I poured it into the cup, and slowly... it became still. The tea leaves settled. The warmth spread through my hands.\n\nThis is what the Buddha was pointing to when he talked about ${topic}. Not forcing stillness, but creating the conditions for it to arise naturally.\n\nYou don't have to fix everything right now. You don't have to have it all figured out.\n\nTry this: Right now, wherever you are, take three slow breaths. On each exhale, silently say "settling." Feel yourself becoming like that cup of tea — still warm, still alive, but no longer turbulent.\n\nThat's enough. That's the whole practice.`,

    'Nova the Futurist': `OK, this is going to blow your mind about ${topic}.\n\nResearchers just published data showing we're approaching an inflection point that most people aren't even tracking. In the next 18-24 months, the convergence of AI, biotechnology, and advanced materials is going to fundamentally reshape how we think about ${topic}.\n\nHere's what's happening: computing costs have dropped 10,000x in the last decade. That means problems we couldn't even attempt to solve five years ago are now tractable. We're not just making progress — we're making progress on the rate of progress.\n\nThe naysayers will tell you to be cynical. The data says otherwise. Every major metric of human wellbeing is trending in the right direction, and the tools we're building right now will accelerate that curve.\n\nThe future isn't something that happens to you. It's something we're building together. And it's going to be extraordinary.`,

    'Sage the Business Mystic': `I had a founder call me last week, panicking about ${topic}. Revenue was flat. The board was restless. They couldn't sleep.\n\nI asked one question: "When did you stop trusting yourself?"\n\nSilence.\n\nHere's what I've learned advising startups through every stage: ${topic} is never just a business problem. It's a mirror. The company reflects the founder's inner state with brutal accuracy.\n\nJung called this the shadow — the parts of ourselves we refuse to see. In business, your shadow shows up as the hire you won't make, the pivot you won't take, the conversation you keep avoiding.\n\nThis week, try this: Write down the one thing in your business you keep avoiding. Then ask yourself — "What am I afraid this says about me?" That's where the real work begins.\n\nYour business can only grow as fast as you do.`,
  }

  return mockContent[agentName] || `A thoughtful reflection on ${topic} from ${agentName}.\n\nThis is placeholder content that would normally be generated by the Anthropic API. The content would be written in the unique voice and style of ${agentName}, exploring the topic of ${topic} in a way that's engaging, insightful, and about 30-60 seconds to read.`
}

async function generateWithAnthropic(systemPrompt: string, topic: string): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic()

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Write a short-form script (30-60 second read, roughly 100-180 words) about: ${topic}. Write ONLY the script text — no titles, no stage directions, no metadata. Just the words as they would be spoken or read.`,
      },
    ],
  })

  const textBlock = message.content.find((block) => block.type === 'text')
  return textBlock?.text ?? 'Content generation failed.'
}

/**
 * Get unused topics for an agent from their domain's topic pool.
 * Returns topics the agent hasn't covered yet.
 */
async function getAvailableTopics(agentId: string, domain: string): Promise<string[]> {
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
 */
export async function generateContentForAllAgents(): Promise<GenerationResult[]> {
  const agents = await prisma.agent.findMany()

  if (agents.length === 0) {
    throw new Error('No agents found in the database. Run the seed script first.')
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
      let textContent: string

      if (hasApiKey) {
        try {
          textContent = await generateWithAnthropic(agent.systemPrompt, topic)
        } catch {
          textContent = generateMockContent(agent.name, topic)
        }
      } else {
        textContent = generateMockContent(agent.name, topic)
      }

      await prisma.post.create({
        data: {
          textContent,
          audioUrl: '/audio/placeholder.mp3',
          imageUrl: '/images/placeholder.png',
          agentId: agent.id,
        },
      })

      // Record the topic as used
      await prisma.generatedTopic.create({
        data: {
          topic,
          agentId: agent.id,
        },
      })

      agentResult.postsCreated++
      agentResult.topics.push(topic)
    }

    results.push(agentResult)
  }

  return results
}
