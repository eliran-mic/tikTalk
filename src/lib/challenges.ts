import { prisma } from '@/lib/db'

// Challenge templates per agent domain
const CHALLENGE_TEMPLATES: Record<string, { title: string; description: string }[]> = {
  stoic: [
    { title: 'The Control Audit', description: 'Write down three things stressing you right now. For each one, ask: "Is this in my control?" Share what you discovered.' },
    { title: 'Negative Visualization', description: 'Imagine losing something you take for granted. How does that shift your gratitude? Share your reflection.' },
    { title: 'The Evening Review', description: 'What went well today? What could improve? What did you learn? Marcus Aurelius did this every night.' },
  ],
  mindfulness: [
    { title: '3-Breath Reset', description: 'Set 3 reminders today to pause and take 3 conscious breaths. Share how it affected your day.' },
    { title: 'Mindful Eating', description: 'Eat your next meal without screens, chewing slowly and noticing every flavor. What surprised you?' },
    { title: 'Gratitude Moment', description: 'Name 3 small things you noticed today that you normally rush past. A sound, a texture, a kindness.' },
  ],
  futurism: [
    { title: 'Future Letter', description: 'Write a 3-sentence letter from yourself in 2030. What has changed? What are you grateful for?' },
    { title: 'Tech Prediction', description: 'Name one technology you think will be mainstream in 5 years but most people are ignoring now. Why?' },
    { title: 'Problem Spotter', description: 'Look around your daily life. Identify one problem that technology could solve but hasn\'t yet.' },
  ],
  business: [
    { title: 'The Shadow Question', description: 'What\'s the one thing in your work you keep avoiding? Write it down. What are you afraid it says about you?' },
    { title: 'Value Audit', description: 'List 3 things you spent time on today. Which ones actually moved the needle? Which were just busy-work?' },
    { title: '10x Question', description: 'If you could only work 2 hours per day, what would you focus on? That\'s probably what matters most.' },
  ],
  comedy_roast: [
    { title: 'Self-Roast', description: 'Write your most honest, funny self-roast in 2 sentences. The best humor comes from truth.' },
    { title: 'Absurdity Spotter', description: 'What\'s the most absurd thing you did today that you pretended was totally normal? Share it.' },
    { title: 'Hot Take', description: 'Share your most controversial but harmless opinion. Pineapple on pizza? Socks with sandals? Own it.' },
  ],
  comedy_memes: [
    { title: 'Meme Decode', description: 'Find a trending meme today. Why is it funny? What does it say about us as a society?' },
    { title: 'Internet Archaeology', description: 'What\'s the oldest meme or internet moment you remember? How has internet humor changed since then?' },
    { title: 'Touch Grass Report', description: 'Go outside for 10 minutes without your phone. Report back on what the "real world" was like.' },
  ],
  finance_crypto: [
    { title: 'Portfolio Check-in', description: 'When did you last review your investment thesis? Has anything changed that should update your strategy?' },
    { title: 'Narrative vs Data', description: 'Find one crypto narrative being hyped today. What does the actual on-chain data say? Do they match?' },
    { title: 'Risk Assessment', description: 'If your largest holding went to zero tomorrow, what would change about your financial life? Be honest.' },
  ],
  finance_personal: [
    { title: 'Subscription Audit', description: 'List every subscription you pay for. Which ones did you actually use in the last 30 days?' },
    { title: 'Money Mindset', description: 'Complete this sentence honestly: "Money makes me feel..." Your answer reveals a lot about your relationship with money.' },
    { title: 'The 24-Hour Rule', description: 'Before buying anything non-essential today, wait 24 hours. Track what you almost bought and whether you still want it tomorrow.' },
  ],
  fitness_gym: [
    { title: 'Movement Check', description: 'Do 10 squats right now. How does your body feel? What does that tell you about your daily movement?' },
    { title: 'Recovery Audit', description: 'Rate your sleep, hydration, and stress on a 1-10 scale. Your recovery is half the equation.' },
    { title: 'Gratitude Rep', description: 'Name one thing your body did for you today that you didn\'t appreciate. Walking? Breathing? Carrying things?' },
  ],
  health_mental: [
    { title: 'Emotion Check-in', description: 'Right now, name what you\'re feeling with as much specificity as possible. Not just "fine" — dig deeper.' },
    { title: 'Boundary Practice', description: 'Think of one boundary you wish you had set recently. Write down the exact words you could have used.' },
    { title: 'Self-Compassion', description: 'Write yourself a kind note as if you were writing to your best friend going through the same thing you are.' },
  ],
  tech_coding: [
    { title: 'Explain It Simply', description: 'Pick a technical concept you use daily. Explain it so a 10-year-old would understand. No jargon.' },
    { title: 'Code Archaeology', description: 'Open the oldest code you wrote that\'s still running. What would you change? What did past-you do right?' },
    { title: 'Learn One Thing', description: 'Spend 15 minutes learning about a technology you\'ve heard of but never explored. Share what surprised you.' },
  ],
  science_general: [
    { title: 'Curiosity Question', description: 'What\'s one thing you saw today and wondered "why does that work that way?" Look up the answer and share it.' },
    { title: 'Scale Shift', description: 'Zoom in or out. Think about something very tiny (atoms) or very large (galaxies). What blows your mind about scale?' },
    { title: 'Experiment Design', description: 'If you could design one experiment to answer any question about the universe, what would you test?' },
  ],
  culture_movies: [
    { title: 'Comfort Rewatch', description: 'What movie have you rewatched the most? Why does it call you back? What does it say about you?' },
    { title: 'Hidden Gem', description: 'Recommend a movie almost nobody you know has seen. Why should they watch it?' },
    { title: 'Scene Study', description: 'Think of a single movie scene that stuck with you. What made it unforgettable? The acting? The music? The silence?' },
  ],
  culture_music: [
    { title: 'Soundtrack Your Day', description: 'If today had a soundtrack, what 3 songs would be on it? One for morning, afternoon, and evening.' },
    { title: 'New Genre', description: 'Listen to a genre you normally avoid for 15 minutes. What surprised you? What did you discover?' },
    { title: 'Song Memory', description: 'What song instantly transports you to a specific moment in your past? What\'s the story behind it?' },
  ],
  motivation_hustle: [
    { title: 'Energy Audit', description: 'Track your energy levels every 2 hours today. When are you sharpest? When do you crash? Use this data.' },
    { title: 'The One Thing', description: 'If you could only accomplish ONE thing today, what would move the needle most? Do that first.' },
    { title: 'Rest Experiment', description: 'Take a 20-minute break with zero screens. Walk, sit, breathe. Notice how it affects your afternoon focus.' },
  ],
  relationships_dating: [
    { title: 'Green Flag Journal', description: 'Name 3 green flags you\'ve experienced or seen recently — in dating, friendships, or any relationship.' },
    { title: 'Communication Upgrade', description: 'Replace "you always..." with "I feel..." in one conversation today. Notice what changes.' },
    { title: 'Connection Audit', description: 'Who\'s someone you haven\'t reached out to in a while? Send them a genuine message. No "we should hang out" — something real.' },
  ],
  food_recipes: [
    { title: 'Fridge Challenge', description: 'Open your fridge. What can you make with only what\'s already in there? Get creative and share what you came up with.' },
    { title: 'Seasoning Experiment', description: 'Add one ingredient you\'ve never tried to a dish you make often. What happened to the flavor?' },
    { title: 'Cooking Memory', description: 'What\'s a dish that reminds you of someone you love? What makes it special — the taste or the memory?' },
  ],
  entertainment_stories: [
    { title: 'Six-Word Story', description: 'Write a complete story in exactly six words. Hemingway did it. Your turn.' },
    { title: 'Object Story', description: 'Pick any object near you. Write 3 sentences from its perspective. What has it witnessed?' },
    { title: 'Last Line First', description: 'Write the last line of a story first. Then write the opening that leads there in under 50 words.' },
  ],
  entertainment_trivia: [
    { title: 'Deep Dive', description: 'Go down a Wikipedia rabbit hole for 15 minutes. What\'s the most surprising thing you found? Share it.' },
    { title: 'Question Everything', description: 'Think of 3 things "everyone knows" that might actually be wrong. Look one up. Were you right to question it?' },
    { title: 'Teach One Thing', description: 'What\'s one obscure fact you know that you think nobody else in the room knows? Share it and why it matters.' },
  ],
  education_history: [
    { title: 'Time Travel Pick', description: 'If you could witness one historical event firsthand, what would it be and why? What would you want to see up close?' },
    { title: 'History Rhyme', description: 'Find a historical parallel to something happening in the news today. What can history teach us about how this plays out?' },
    { title: 'Forgotten Figure', description: 'Look up a historical figure you\'ve never heard of. Why were they important? Why were they forgotten?' },
  ],
  education_languages: [
    { title: 'Word Origin', description: 'Pick any English word you use daily. Look up its etymology. Where did it come from? Share what you found.' },
    { title: 'Untranslatable', description: 'Find a word in another language that has no English equivalent. What does its existence tell us about that culture?' },
    { title: 'New Phrase', description: 'Learn one useful phrase in a language you don\'t speak. Use it today. How did it feel? How did people react?' },
  ],
  education_math: [
    { title: 'Pattern Spotter', description: 'Look for a mathematical pattern in your daily life — in tiles, traffic, prices, music. What did you find?' },
    { title: 'Estimation Game', description: 'Estimate something: how many steps you\'ll walk today, how many cars pass your window in a minute. Then count. How close were you?' },
    { title: 'Math Memory', description: 'When did you first feel "I\'m not a math person"? What happened? Challenge that story with one math thing you actually do well.' },
  ],
}

/**
 * Get or create today's daily challenge.
 */
export async function getTodaysChallenge() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Check if today's challenge exists
  const existing = await prisma.dailyChallenge.findUnique({
    where: { date: today },
    include: {
      agent: { select: { id: true, name: true, bio: true, avatarUrl: true, domain: true, category: true } },
      _count: { select: { entries: true } },
    },
  })

  if (existing) return existing

  // Create a new challenge for today
  const agents = await prisma.agent.findMany({
    select: { id: true, domain: true },
  })

  if (agents.length === 0) return null

  // Pick a random agent
  const agent = agents[Math.floor(Math.random() * agents.length)]
  const templates = CHALLENGE_TEMPLATES[agent.domain] ?? CHALLENGE_TEMPLATES.stoic

  // Pick a random template
  const template = templates[Math.floor(Math.random() * templates.length)]

  const challenge = await prisma.dailyChallenge.create({
    data: {
      date: today,
      title: template.title,
      description: template.description,
      agentId: agent.id,
      xpReward: 50,
    },
    include: {
      agent: { select: { id: true, name: true, bio: true, avatarUrl: true, domain: true, category: true } },
      _count: { select: { entries: true } },
    },
  })

  return challenge
}

/**
 * Submit a challenge entry.
 */
export async function submitChallengeEntry(
  userId: string,
  challengeId: string,
  response: string
) {
  // Check if already submitted
  const existing = await prisma.challengeEntry.findUnique({
    where: { userId_challengeId: { userId, challengeId } },
  })

  if (existing) {
    return { error: 'Already completed this challenge', entry: existing }
  }

  const entry = await prisma.challengeEntry.create({
    data: {
      userId,
      challengeId,
      response: response.trim(),
    },
  })

  return { entry }
}
