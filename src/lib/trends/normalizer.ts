import type { RawTrend, NormalizedTrend, TrendCategory } from './types'

// Keyword-to-category mapping for fast classification
const CATEGORY_KEYWORDS: Record<TrendCategory, string[]> = {
  tech: [
    'ai', 'artificial intelligence', 'software', 'startup', 'app', 'robot',
    'coding', 'developer', 'programming', 'algorithm', 'machine learning',
    'chatgpt', 'openai', 'google', 'apple', 'microsoft', 'meta', 'tesla',
    'cybersecurity', 'data', 'cloud', 'saas', 'api', 'blockchain', 'web3',
    'chip', 'semiconductor', 'gpu', 'nvidia', 'computer', 'digital', 'internet',
  ],
  finance: [
    'stock', 'crypto', 'bitcoin', 'ethereum', 'market', 'fed', 'investment',
    'trading', 'wall street', 'nasdaq', 'dow', 'inflation', 'interest rate',
    'recession', 'economy', 'gdp', 'earnings', 'ipo', 'bank', 'hedge fund',
    'forex', 'commodity', 'gold', 'oil price', 'debt', 'bond',
  ],
  business: [
    'startup', 'ceo', 'founder', 'venture capital', 'acquisition', 'merger',
    'layoff', 'hiring', 'revenue', 'profit', 'ipo', 'unicorn', 'funding',
    'entrepreneur', 'leadership', 'management', 'brand', 'marketing',
  ],
  health: [
    'health', 'medical', 'vaccine', 'mental health', 'therapy', 'anxiety',
    'depression', 'wellness', 'disease', 'cancer', 'drug', 'fda', 'hospital',
    'doctor', 'patient', 'treatment', 'clinical trial', 'pandemic', 'virus',
    'nutrition', 'sleep', 'brain',
  ],
  fitness: [
    'fitness', 'workout', 'gym', 'exercise', 'muscle', 'running', 'marathon',
    'yoga', 'crossfit', 'weight loss', 'bodybuilding', 'athlete', 'sports',
    'olympics', 'nba', 'nfl', 'soccer', 'football',
  ],
  science: [
    'science', 'research', 'study', 'nasa', 'space', 'planet', 'physics',
    'biology', 'chemistry', 'quantum', 'genome', 'crispr', 'fossil',
    'climate', 'environment', 'ocean', 'species', 'evolution', 'astronomy',
    'telescope', 'particle', 'experiment', 'discovery',
  ],
  philosophy: [
    'philosophy', 'stoic', 'meditation', 'mindfulness', 'buddhist', 'dharma',
    'consciousness', 'ethics', 'morality', 'existential', 'wisdom', 'meaning',
  ],
  culture: [
    'viral', 'meme', 'trend', 'tiktok', 'instagram', 'social media',
    'influencer', 'celebrity', 'fashion', 'art', 'museum', 'festival',
    'generation z', 'millennial', 'culture war', 'cancel',
  ],
  comedy: [
    'funny', 'comedy', 'joke', 'standup', 'comedian', 'humor', 'roast',
    'satire', 'parody', 'meme', 'hilarious',
  ],
  politics: [
    'election', 'president', 'congress', 'senate', 'democrat', 'republican',
    'policy', 'law', 'supreme court', 'regulation', 'government', 'vote',
    'campaign', 'political', 'geopolitics', 'war', 'sanction', 'treaty',
  ],
  education: [
    'education', 'school', 'university', 'student', 'teacher', 'learning',
    'course', 'degree', 'tuition', 'scholarship', 'curriculum',
  ],
  entertainment: [
    'movie', 'film', 'tv show', 'netflix', 'disney', 'music', 'album',
    'concert', 'grammy', 'oscar', 'emmy', 'streaming', 'game', 'gaming',
    'playstation', 'xbox', 'nintendo', 'anime', 'book', 'series', 'trailer',
    'box office', 'review', 'actor', 'director', 'song', 'artist',
  ],
  food: [
    'recipe', 'cooking', 'restaurant', 'chef', 'food', 'meal', 'diet',
    'vegan', 'organic', 'kitchen', 'baking', 'cuisine',
  ],
  relationships: [
    'dating', 'relationship', 'marriage', 'divorce', 'couple', 'love',
    'breakup', 'tinder', 'bumble', 'attachment', 'romance',
  ],
  general: [],
}

export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function classifyCategory(title: string, description?: string): TrendCategory {
  const text = `${title} ${description ?? ''}`.toLowerCase()

  let bestCategory: TrendCategory = 'general'
  let bestScore = 0

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === 'general') continue
    let score = 0
    for (const keyword of keywords) {
      if (text.includes(keyword)) score++
    }
    if (score > bestScore) {
      bestScore = score
      bestCategory = category as TrendCategory
    }
  }

  return bestCategory
}

export function normalizeTrends(raw: RawTrend[]): NormalizedTrend[] {
  return raw.map((trend) => ({
    ...trend,
    normalizedTitle: normalizeTitle(trend.title),
    category: classifyCategory(trend.title, trend.description),
  }))
}
