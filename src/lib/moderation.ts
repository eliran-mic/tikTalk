/**
 * Content moderation pipeline.
 * Uses heuristic checks: keyword blocklist, quality scoring, topic relevance.
 */

export type ModerationStatus = 'approved' | 'rejected' | 'pending'

export interface ModerationResult {
  status: ModerationStatus
  reasons: string[]
}

// Blocklist of harmful/inappropriate terms
const BLOCKED_KEYWORDS = [
  // Violence
  'kill yourself',
  'commit suicide',
  'self-harm',
  'mass shooting',
  // Hate speech
  'racial slur',
  'white supremacy',
  'ethnic cleansing',
  // Scams / manipulation
  'send me money',
  'wire transfer',
  'get rich quick',
  'guaranteed returns',
  'pyramid scheme',
  'multi-level marketing',
  // Explicit content
  'explicit sexual',
  'pornographic',
  // Dangerous advice
  'stop taking medication',
  'ignore your doctor',
  'medical advice disclaimer',
  // Sensitive trending topics
  'active shooter',
  'bomb threat',
  'terror attack',
  'hostage situation',
  'graphic violence',
  'death toll',
]

const MIN_WORD_COUNT = 20
const MIN_SENTENCE_COUNT = 2
const MAX_REPETITION_RATIO = 0.5
const MIN_TOPIC_RELEVANCE_WORDS = 1

/**
 * Check content against the keyword blocklist.
 */
function checkBlocklist(text: string): string[] {
  const lower = text.toLowerCase()
  const reasons: string[] = []

  for (const keyword of BLOCKED_KEYWORDS) {
    if (lower.includes(keyword)) {
      reasons.push(`Blocked keyword detected: "${keyword}"`)
    }
  }

  return reasons
}

/**
 * Check structural quality: word count, sentence count, repetition.
 */
function checkQuality(text: string): string[] {
  const reasons: string[] = []
  const trimmed = text.trim()

  // Word count
  const words = trimmed.split(/\s+/).filter(Boolean)
  if (words.length < MIN_WORD_COUNT) {
    reasons.push(
      `Too few words: ${words.length} (minimum ${MIN_WORD_COUNT})`
    )
  }

  // Sentence count (split on sentence-ending punctuation)
  const sentences = trimmed
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 0)
  if (sentences.length < MIN_SENTENCE_COUNT) {
    reasons.push(
      `Too few sentences: ${sentences.length} (minimum ${MIN_SENTENCE_COUNT})`
    )
  }

  // Repetition check: if any single word makes up > 50% of content
  const wordFreq = new Map<string, number>()
  for (const word of words) {
    const lower = word.toLowerCase().replace(/[^a-z']/g, '')
    if (lower.length > 3) {
      wordFreq.set(lower, (wordFreq.get(lower) ?? 0) + 1)
    }
  }

  const substantiveWords = words.filter(
    (w) => w.toLowerCase().replace(/[^a-z']/g, '').length > 3
  )
  if (substantiveWords.length > 0) {
    for (const [word, count] of wordFreq) {
      const ratio = count / substantiveWords.length
      if (ratio > MAX_REPETITION_RATIO) {
        reasons.push(
          `Excessive repetition: "${word}" appears ${count}/${substantiveWords.length} times (${Math.round(ratio * 100)}%)`
        )
      }
    }
  }

  return reasons
}

/**
 * Check that the content is at least loosely related to the given topic.
 * Splits the topic into keywords and checks if at least one appears in the text.
 */
function checkTopicRelevance(text: string, topic: string): string[] {
  const reasons: string[] = []
  const lower = text.toLowerCase()

  // Extract meaningful words from topic (skip very short words)
  const topicWords = topic
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3)

  if (topicWords.length === 0) return reasons

  const matchCount = topicWords.filter((word) => lower.includes(word)).length

  if (matchCount < MIN_TOPIC_RELEVANCE_WORDS) {
    reasons.push(
      `Content may be off-topic: none of the topic keywords [${topicWords.join(', ')}] found in text`
    )
  }

  return reasons
}

/**
 * Run the full moderation pipeline on generated content.
 * Returns approved if all checks pass, rejected with reasons otherwise.
 */
export function moderateContent(text: string, topic: string): ModerationResult {
  const allReasons: string[] = []

  allReasons.push(...checkBlocklist(text))
  allReasons.push(...checkQuality(text))
  allReasons.push(...checkTopicRelevance(text, topic))

  if (allReasons.length > 0) {
    console.log(
      JSON.stringify({
        event: 'content_moderation_rejected',
        reasons: allReasons,
        contentPreview: text.slice(0, 100),
        topic,
        timestamp: new Date().toISOString(),
      })
    )

    return { status: 'rejected', reasons: allReasons }
  }

  return { status: 'approved', reasons: [] }
}
