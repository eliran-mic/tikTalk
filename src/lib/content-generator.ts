import { prisma } from '@/lib/db'
import { generateTTSDataUri } from '@/lib/tts'
import {
  createGenerationLogger,
  type GenerationMetrics,
} from '@/lib/generation-logger'
import { moderateContent, type ModerationStatus } from '@/lib/moderation'
import { matchTrendsToAgent } from '@/lib/trends/matcher'

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
  comedy_roast: [
    'why everyone pretends to love Monday mornings',
    'the absurdity of hustle culture influencers',
    'dating app bios that need professional help',
    'meetings that could have been emails',
    'the fake productivity of reorganizing your desk',
    'why we all became amateur chefs during lockdown and stopped',
    'the audacity of subscription services',
    'performative LinkedIn posts from thought leaders',
    'people who say they dont watch TV',
    'the cult of morning routines',
    'people who make their personality their diet',
    'the ridiculousness of crypto bros explaining blockchain at parties',
    'why every startup calls itself a platform',
    'the illusion of inbox zero',
    'gym selfie culture and the performance of fitness',
    'people who peaked in their study abroad semester',
    'the absolute chaos of group chats',
    'influencers discovering what regular people already knew',
    'the comedy of work-life balance advice from CEOs',
    'adulting is just googling how to do things',
    'the passive aggression of calendar invites',
    'reply all catastrophes at work',
    'people who say they are fluent after one Duolingo lesson',
    'the performance art of looking busy in an open office',
    'unhinged things people say on LinkedIn',
    'the existential dread of choosing what to watch on Netflix',
    'why nobody actually reads the terms and conditions',
    'the theater of looking productive on video calls',
    'airport behavior that would be insane anywhere else',
    'the audacity of upselling at checkout',
  ],
  comedy_memes: [
    'why certain meme formats refuse to die',
    'the lifecycle of a viral tweet',
    'how different generations use the same emoji differently',
    'the art of the ratio on social media',
    'why we communicate complex emotions through memes',
    'the unwritten rules of internet comment sections',
    'how niche communities create their own meme languages',
    'the phenomenon of main character syndrome online',
    'doomscrolling as a collective coping mechanism',
    'parasocial relationships in the influencer age',
    'the bizarre economy of internet clout',
    'why we overshare on social media then delete it at 3 AM',
    'the evolution of internet humor from rage comics to surreal memes',
    'why copypasta is the oral tradition of the internet',
    'the science of why some things go viral',
    'algorithmic brain rot and what it does to our humor',
    'the difference between Twitter humor and TikTok humor',
    'reddit culture and the upvote hivemind',
    'the art of the perfect meme caption',
    'terminally online behavior explained for normal people',
    'the cycle of outrage on social media',
    'how brands try and fail to use memes',
    'the golden age of Vine and its cultural legacy',
    'internet slang that accidentally became real language',
    'the psychology behind going viral',
    'chaotic energy as an internet aesthetic',
    'why we find AI-generated images so uncanny and hilarious',
    'the subculture of niche Discord communities',
    'chronically online takes that are accidentally profound',
    'the death and resurrection cycle of social media platforms',
  ],
  finance_crypto: [
    'what on-chain data actually tells us about market sentiment',
    'the real utility of smart contracts beyond speculation',
    'why most crypto projects fail and what the survivors have in common',
    'the evolution of DeFi from experiment to infrastructure',
    'how regulation is reshaping the crypto landscape',
    'the truth about stablecoins and systemic risk',
    'why institutions are entering crypto now',
    'the energy debate around proof of work vs proof of stake',
    'what the next Bitcoin halving means for markets',
    'layer 2 solutions and the scaling trilemma',
    'the rise of real-world asset tokenization',
    'lessons from every major crypto crash in history',
    'the psychological traps of crypto trading',
    'how DAOs are experimenting with governance',
    'zero-knowledge proofs and the future of privacy',
    'why most people misunderstand blockchain technology',
    'the macro case for and against Bitcoin as digital gold',
    'how cross-chain interoperability is evolving',
    'the difference between speculation and investment in crypto',
    'what Ethereum roadmap updates mean for developers',
    'the state of NFTs beyond profile pictures',
    'central bank digital currencies and what they mean for crypto',
    'the role of crypto in emerging economies',
    'security lessons from major DeFi hacks',
    'memecoins and what they reveal about market psychology',
    'the institutional infrastructure being built around crypto',
    'tax implications of crypto that catch people off guard',
    'how AI and blockchain are converging',
    'the bear case for crypto that bulls should take seriously',
    'decentralized identity and why it matters',
  ],
  finance_personal: [
    'the 50-30-20 rule and why it actually works',
    'how to negotiate your salary without feeling awkward',
    'subscription audit: the money leaks you forgot about',
    'why emergency funds need to be boring',
    'the real cost of keeping up with the Joneses',
    'index funds vs individual stocks for normal people',
    'how to start investing with just 50 dollars',
    'credit score myths that are costing you money',
    'the psychology of impulse buying and how to beat it',
    'high-yield savings accounts and free money you are leaving on the table',
    'debt snowball vs debt avalanche which actually works better',
    'the latte factor is a lie but spending awareness isnt',
    'how to talk about money with your partner without fighting',
    'retirement savings in your 20s vs 30s the math is brutal',
    'lifestyle inflation the silent wealth killer',
    'the true cost of car ownership vs alternatives',
    'why budgets fail and what to do instead',
    'financial independence and the FIRE movement reality check',
    'how to deal with money anxiety without avoiding your accounts',
    'the power of automating your finances',
    'side hustles that actually generate meaningful income',
    'understanding your paycheck what all those deductions mean',
    'the financial checklist for every major life milestone',
    'why you dont need to own a home to build wealth',
    'compound interest explained with real numbers',
    'how to handle a financial windfall without blowing it',
    'the difference between being cheap and being frugal',
    'protecting your finances during economic uncertainty',
    'money scripts the hidden beliefs sabotaging your finances',
    'the gap between feeling rich and being financially secure',
  ],
  fitness_gym: [
    'the only exercises you actually need for a solid foundation',
    'progressive overload explained for people who hate math',
    'why you are probably not eating enough protein',
    'rest days are not lazy days the science of recovery',
    'the truth about spot reduction and targeted fat loss',
    'how to fix your squat form without a personal trainer',
    'the minimum effective dose of exercise for health',
    'why cardio and strength training are not enemies',
    'meal prep strategies that dont make you hate food',
    'the psychology of gym intimidation and how to get past it',
    'creatine the most studied supplement and what it actually does',
    'how sleep affects your gains more than your workout does',
    'the difference between training hard and training smart',
    'home workouts vs gym which actually gets better results',
    'why the scale lies and better ways to track progress',
    'stretching myths and what mobility work actually helps',
    'how to come back to the gym after a long break',
    'the science of muscle memory and why it is real',
    'pre-workout nutrition what to eat and when',
    'why women should lift heavy weights too',
    'the mental health benefits of exercise backed by research',
    'how to build a workout routine that you will actually stick to',
    'overtraining syndrome the signs you are doing too much',
    'walking is underrated the most accessible exercise on earth',
    'the truth about abs and what body fat percentage actually means',
    'how to warm up properly in under 5 minutes',
    'the role of stress management in body composition',
    'fitness influencer advice that is actually dangerous',
    'how your posture affects everything and simple fixes',
    'the case for training with a partner or accountability buddy',
  ],
  health_mental: [
    'what anxiety actually is and why your body does it',
    'the difference between sadness and depression',
    'how to set boundaries without feeling guilty',
    'therapy modalities explained which one might work for you',
    'burnout is not just being tired it is a system failure',
    'the nervous system explained for people who live in fight or flight',
    'why toxic positivity makes things worse',
    'ADHD in adults the symptoms nobody talks about',
    'how to support someone with depression without fixing them',
    'the grief nobody warned you about ambiguous loss',
    'social media and mental health what the research actually says',
    'the window of tolerance and why you flip between shutdown and overwhelm',
    'journaling prompts that actually help not just dear diary',
    'attachment styles in adult relationships explained simply',
    'the difference between self-care and avoidance',
    'how trauma lives in the body not just the mind',
    'the perfectionism to procrastination pipeline',
    'why saying I am fine is the most common lie',
    'imposter syndrome and the people it hits hardest',
    'how to find a therapist when you have no idea where to start',
    'the power of naming your emotions emotional granularity',
    'people pleasing is not kindness it is a survival strategy',
    'seasonal affective disorder and what actually helps',
    'the connection between gut health and mental health',
    'why comparing your insides to others outsides never works',
    'managing anxiety at work without anyone knowing you are struggling',
    'the real reason you procrastinate hint it is not laziness',
    'how to have a mental health conversation with someone you love',
    'digital minimalism for better mental health',
    'self-compassion is not selfish it is the foundation of resilience',
  ],
  tech_coding: [
    'what Big O notation actually means in plain English',
    'the restaurant analogy for APIs that makes them click',
    'git explained as a time travel machine',
    'why every developer should understand databases even frontend devs',
    'the difference between authentication and authorization',
    'recursion explained with Russian nesting dolls',
    'why your code works on your machine but not in production',
    'the postal system analogy for how the internet works',
    'microservices vs monoliths the honest tradeoffs',
    'technical debt explained as a credit card for code',
    'how to read someone elses code without losing your mind',
    'the 10x developer myth and what actually makes great engineers',
    'design patterns you use every day without knowing it',
    'why testing your code is like wearing a seatbelt',
    'the CAP theorem explained for normal humans',
    'how to debug like a detective not a slot machine',
    'what happens when you type a URL into your browser',
    'the difference between compiled and interpreted languages',
    'containerization explained as shipping containers',
    'why every developer should learn SQL',
    'the art of writing code that your future self can read',
    'race conditions explained with a real world traffic analogy',
    'how to prepare for coding interviews without grinding leetcode',
    'the software engineering career ladder what each level means',
    'open source how to start contributing even as a beginner',
    'event-driven architecture explained as a restaurant kitchen',
    'why naming things is the hardest problem in computer science',
    'the difference between good enough and perfect in software',
    'how to estimate software projects without lying',
    'the most underrated skill in engineering clear communication',
  ],
  science_general: [
    'why water is the weirdest substance on Earth',
    'the scale of the universe from quarks to superclusters',
    'how your brain creates the illusion of consciousness',
    'the paradox of the ship of Theseus and what it means for identity',
    'why we sleep and what happens when we dont',
    'the double slit experiment and the strangeness of quantum mechanics',
    'how bacteria in your gut influence your mood and decisions',
    'the Fermi paradox where is everyone',
    'why time moves forward and not backward',
    'the placebo effect is way more powerful than you think',
    'how evolution explains altruism in a survival-of-the-fittest world',
    'the science of habit formation and neuroplasticity',
    'why deep ocean life is weirder than alien science fiction',
    'the birthday paradox and why probability breaks intuition',
    'how CRISPR is rewriting the code of life',
    'the science of why music gives you chills',
    'dark matter and dark energy what we know about what we cant see',
    'the biology of love and pair bonding in humans',
    'how memory works and why it is so unreliable',
    'the greenhouse effect explained without the politics',
    'why identical twins diverge over time epigenetics explained',
    'the science of optical illusions and how your brain fills in gaps',
    'tardigrades the most indestructible creatures on Earth',
    'how vaccines actually work at the cellular level',
    'the science of color why we see what we see',
    'the Mpemba effect and other counterintuitive physics',
    'how radiocarbon dating tells us the age of ancient things',
    'the simulation hypothesis is it science or philosophy',
    'synesthesia and the different ways brains can be wired',
    'the science of why exercise makes you smarter',
  ],
  culture_movies: [
    'directors who completely reinvented a genre',
    'the art of the opening scene and why first impressions matter',
    'underrated films from the last decade that deserve more love',
    'how sound design makes horror movies actually scary',
    'the best performances in films nobody saw',
    'movie trilogies that stuck the landing and ones that didnt',
    'the rise of A24 and what it means for independent cinema',
    'why some movies age like wine and others like milk',
    'the cinematography techniques that make you feel without words',
    'book adaptations that were better than the source material',
    'the psychology of why we rewatch comfort movies',
    'directors who use color as a storytelling tool',
    'the most perfectly cast roles in film history',
    'why movie endings matter more than we think',
    'the art of the plot twist when it works and when it cheats',
    'documentary filmmaking that changed public opinion',
    'the streaming wars and what they mean for movie quality',
    'foreign films that will expand your worldview',
    'method acting is it genius or just suffering',
    'the best film scores and how music shapes narrative',
    'movies that predicted the future with eerie accuracy',
    'the evolution of special effects from practical to CGI',
    'cult classics and why some films build followings decades later',
    'the test of time what makes a film a true classic',
    'movie marathons themed viewing guides for every mood',
    'the unsung heroes of filmmaking editors cinematographers and more',
    'romantic comedies deserve more respect as a genre',
    'the art of the movie trailer and why some spoil everything',
    'films that tackled mental health with honesty and care',
    'why every filmmaker should study silent cinema',
  ],
  culture_music: [
    'why certain chord progressions make you feel nostalgic',
    'albums that deserve a start-to-finish listen',
    'the producers shaping modern music behind the scenes',
    'genre-bending artists who refuse to be categorized',
    'why vinyl records made a comeback and what it means',
    'the science of earworms and why songs get stuck',
    'underrated artists who deserve way more listeners',
    'how streaming changed music for better and worse',
    'the art of the album closer why last tracks matter',
    'live performances that were better than the studio version',
    'music theory tricks that hit you in the feels every time',
    'how different cultures approach rhythm and melody',
    'the evolution of hip hop from the Bronx to global dominance',
    'concept albums that tell a complete story',
    'the role of bass in music and why you feel it in your chest',
    'artists who completely reinvented themselves between albums',
    'the golden era of a genre and what made it special',
    'music and memory why songs transport you back in time',
    'the democratization of music production in the bedroom era',
    'collaborations that shouldnt have worked but absolutely did',
    'how film scores create emotions without lyrics',
    'the most influential albums most people have never heard',
    'why some voices are immediately recognizable in one note',
    'the relationship between music and movement dance as expression',
    'how autotune went from a secret tool to an art form',
    'the mathematics hidden inside music',
    'songs that changed the world through protest and hope',
    'the art of the music video as its own medium',
    'why lo-fi beats help you study and focus',
    'the future of music AI collaboration or replacement',
  ],
  motivation_hustle: [
    'the myth of motivation and why discipline matters more',
    'time blocking the one productivity system that actually works',
    'why your to-do list is making you less productive',
    'the power of saying no to almost everything',
    'deep work in an age of constant distraction',
    'the two-minute rule and why small wins compound',
    'energy management vs time management which wins',
    'why rest is not the opposite of productivity',
    'the planning fallacy and why everything takes longer than you think',
    'batching similar tasks for maximum flow state',
    'digital minimalism tools that free your attention',
    'the pomodoro technique and other focus frameworks compared',
    'how to stop context switching and protect your flow',
    'the weekly review habit that changes everything',
    'decision fatigue and why successful people simplify choices',
    'how to set goals that you will actually achieve',
    'the 80/20 principle applied to your daily work',
    'morning routines that are backed by science not influencers',
    'how to build habits that stick according to behavioral science',
    'the myth of multitasking and what your brain actually does',
    'strategic laziness doing less of what doesnt matter',
    'how to recover from burnout without quitting everything',
    'the eisenhower matrix for ruthless prioritization',
    'why perfectionism kills more projects than laziness does',
    'the science of willpower and why it runs out',
    'systems thinking for personal productivity',
    'how to handle an overwhelming workload without panicking',
    'the compound effect of tiny daily improvements',
    'attention residue why you feel scattered after switching tasks',
    'building a second brain and offloading mental overhead',
  ],
  relationships_dating: [
    'attachment styles explained and why they matter in dating',
    'green flags that actually predict a healthy relationship',
    'the anxious-avoidant trap and how to break the cycle',
    'how to have the what are we conversation without losing your mind',
    'dating app fatigue and how to date intentionally',
    'the difference between chemistry and compatibility',
    'love languages are they useful or just oversimplified',
    'how to set boundaries in a new relationship',
    'the slow fade why people ghost and what to do about it',
    'what healthy conflict looks like in a relationship',
    'the ick factor and what it actually tells you about yourself',
    'how to date as an introvert without pretending to be someone else',
    'emotional availability the most attractive trait nobody talks about',
    'the rebound myth when is it actually okay to start dating again',
    'how social media distorts our expectations of relationships',
    'the difference between loneliness and being alone',
    'communication styles that build intimacy not walls',
    'deal breakers vs preferences knowing the difference',
    'how to stop attracting the same type of wrong person',
    'the science of attraction what research actually tells us',
    'vulnerability as strength in romantic relationships',
    'how childhood patterns show up in adult relationships',
    'navigating cultural differences in dating',
    'the paradox of choice in modern dating',
    'relationship maintenance the boring stuff that keeps love alive',
    'how to argue well not less but better',
    'when to stay and when to leave the question nobody can answer for you',
    'the role of friendship as a foundation for romance',
    'moving in together what nobody warns you about',
    'self-worth and dating why you attract what you believe you deserve',
  ],
  food_recipes: [
    'the five mother sauces and how they unlock hundreds of dishes',
    'one-pan dinners that taste like you tried way harder than you did',
    'the science of caramelization and why browning equals flavor',
    'budget grocery lists that make meal prep actually affordable',
    'seasoning basics the difference between bland and restaurant quality',
    'how to make restaurant-style fried rice at home',
    'the magic of acid why lemon juice fixes almost everything',
    'batch cooking strategies for people who hate cooking every day',
    'knife skills that make prep work three times faster',
    'the sheet pan dinner formula that works with any protein',
    'why you should be cooking with more spices than salt and pepper',
    'fermented foods at home starting with the easiest ones',
    'the perfect scrambled eggs technique that changes everything',
    'how to build a salad that you actually want to eat',
    'pasta water is liquid gold and heres why',
    'meal prep for people who get bored eating the same thing',
    'the food science behind why cookies have different textures',
    'quick pickles and how they level up any meal instantly',
    'building flavor layers the secret to restaurant cooking',
    'how to cook steak perfectly every time without a thermometer',
    'global pantry staples that transform simple ingredients',
    'the art of the marinade why time and acid make everything better',
    'breakfast for dinner recipes that feel special',
    'how to substitute ingredients without ruining the recipe',
    'the freezer meal strategy that saves both time and money',
    'why homemade bread is easier than you think',
    'leftover transformations turning last night into tonight',
    'the umami factor and ingredients that add savory depth',
    'smoothie formulas that taste good and are actually nutritious',
    'kitchen tools that are actually worth the money',
  ],
  entertainment_stories: [
    'a letter found in a time capsule from 2087',
    'the last librarian in a world that forgot how to read',
    'two strangers share an umbrella and a secret',
    'an AI develops a sense of nostalgia for the first time',
    'the lighthouse keeper who collects lost things from the sea',
    'a conversation between a tree and the city that grew around it',
    'the moment a musician plays the wrong note and discovers something beautiful',
    'a child explains death to an immortal being',
    'the astronaut who receives a message from their past self',
    'a restaurant that serves meals from your memories',
    'the last voicemail from someone who mattered',
    'a world where dreams are a shared public space',
    'the map maker who discovers a country that shouldnt exist',
    'two people falling in love through handwritten notes in library books',
    'an old robot learns what retirement means',
    'the day gravity worked differently for exactly one person',
    'a photographer captures an image of tomorrow',
    'the translator who can hear what animals are really saying',
    'a garden that grows emotions instead of flowers',
    'the watch repair person who can see the history of each watch',
    'a city where everyone wakes up speaking a different language',
    'the night shift worker who befriends the moon',
    'a message in a bottle arrives 200 years too late or just in time',
    'the elevator that stops between floors for exactly three minutes',
    'a painter who can only paint things that havent happened yet',
    'the bookshop where the stories change depending on who reads them',
    'a grandmother teaches her granddaughter to cook and tells her real story',
    'the scientist who proves the existence of parallel lives',
    'a door appears in the middle of an ordinary apartment',
    'the last sunset on a world about to change forever',
  ],
  entertainment_trivia: [
    'the most expensive object ever built by humans',
    'words that exist in other languages but not in English',
    'the shortest war in history lasted 38 minutes',
    'animals with abilities that seem completely made up',
    'the accidental inventions that changed the world',
    'historical figures who were alive at the same time and it breaks your brain',
    'the deepest hole ever dug and what they found',
    'country borders that make absolutely no sense',
    'the food origins that would surprise you',
    'optical illusions your brain simply cannot resist',
    'the oldest living things on Earth and theyre not what you expect',
    'numbers and statistics that change how you see the world',
    'the most isolated places on the planet where people actually live',
    'everyday objects with hidden features you never noticed',
    'animals that are way smarter than we give them credit for',
    'the strangest laws still on the books around the world',
    'coincidences from history that seem too perfect to be random',
    'the human body facts that sound fake but are absolutely real',
    'languages with only a handful of speakers left',
    'the origins of common phrases and why we still say them',
    'planets and moons in our solar system that are genuinely wild',
    'the most successful con artists in history',
    'things that are way older or younger than most people think',
    'the psychology behind why magic tricks fool your brain',
    'world records that seem impossible but are verified',
    'the surprising connections between seemingly unrelated things',
    'ancient technologies that were way ahead of their time',
    'the science behind everyday mysteries like why the sky is blue',
    'famous last words and the stories behind them',
    'the most remote scientific research stations on Earth',
  ],
  education_history: [
    'the empire most people have never heard of that shaped the modern world',
    'history rhymes the eerie parallels between past and present crises',
    'the woman who changed the course of a war and was erased from textbooks',
    'the weirdest diplomatic incidents in history',
    'ancient technologies that we still cannot fully explain',
    'the day that almost ended the world and nobody noticed',
    'how a single assassination reshaped an entire century',
    'the greatest heist in history and how they almost got away with it',
    'civilizations that vanished overnight and what we think happened',
    'the propaganda techniques that worked then and still work now',
    'history most absurd laws and the stories behind them',
    'the trade routes that connected the ancient world more than we realized',
    'revolutions that started with something ridiculously small',
    'the spy stories from history that are wilder than any fiction',
    'how pandemics have reshaped societies throughout history',
    'the forgotten golden ages of science and learning',
    'historical figures who were way ahead of their time',
    'the real stories behind famous last stands',
    'how food and spices literally shaped world history',
    'the most consequential decisions made by people under 25',
    'ancient democracy and how it was nothing like what we have today',
    'the migration patterns that created the modern world',
    'history most dramatic betrayals and their consequences',
    'how weather and climate changed the outcome of wars',
    'the inventions that were discovered by complete accident',
    'empires that fell because of one catastrophic mistake',
    'the real pirates and how different they were from the movies',
    'historical friendships that changed the world',
    'the economics behind the rise and fall of civilizations',
    'myths vs reality the historical events we get completely wrong',
  ],
  education_languages: [
    'words that exist in other languages but have no English equivalent',
    'the surprising family tree of languages and how they are related',
    'false friends words that look the same in two languages but mean different things',
    'how the alphabet you use shapes how you think',
    'the most efficient language learning techniques backed by science',
    'why some languages have gendered nouns and what that does to thinking',
    'the etymology of everyday words that have wild origin stories',
    'dead languages that still secretly influence how you speak',
    'tongue twisters from around the world and what makes them hard',
    'the fastest way to learn vocabulary without flashcards',
    'how sign languages have their own grammar and slang',
    'why some languages have no word for blue',
    'the grammar hack that makes any romance language easier',
    'loanwords the words English stole from every language on Earth',
    'how children learn languages versus how adults learn',
    'constructed languages from Esperanto to Klingon and what they reveal',
    'the politeness systems in languages that English completely lacks',
    'why Japanese has three writing systems and how they work together',
    'the sounds that only exist in certain languages and why',
    'bilingual brains how speaking two languages changes your thinking',
    'the most commonly mispronounced words in every major language',
    'how emojis became a universal language across cultures',
    'the writing systems that read right to left and why',
    'accents and dialects why we sound different even in the same language',
    'the oldest written languages and what their first texts were about',
    'code-switching why bilinguals mix languages and what it means',
    'the grammar rules native speakers follow without knowing them',
    'how translation can never be perfect and why that is beautiful',
    'language death why a language dies every two weeks',
    'the cognitive benefits of learning a language at any age',
  ],
  education_math: [
    'the fibonacci sequence in nature why sunflowers and pinecones follow math',
    'why zero was the most revolutionary number ever invented',
    'the birthday paradox and why probability breaks your intuition',
    'how GPS uses geometry that is 2000 years old',
    'the math behind music why certain chords sound good together',
    'infinity is weirder than you think there are different sizes of infinity',
    'the golden ratio truth and myth about the most beautiful number',
    'how encryption keeps your messages safe using prime numbers',
    'the four color theorem you only need four colors for any map',
    'fractals the infinite patterns hiding in nature',
    'why we use base 10 and the civilizations that counted differently',
    'the monty hall problem and why your intuition is wrong',
    'how statistics lie and how to spot misleading data',
    'the traveling salesman problem and why simple questions can be impossibly hard',
    'game theory the math of strategy that runs the world',
    'why pi goes on forever and what that means',
    'the math behind compound interest and why Einstein called it the eighth wonder',
    'topology the math where a coffee mug and a donut are the same thing',
    'how algorithms decide what you see on social media',
    'the bell curve and why average is more interesting than you think',
    'negative numbers the concept people refused to accept for centuries',
    'the math of voting systems and why no system is perfect',
    'how calculus explains the physics of everyday movement',
    'the bridges of Konigsberg the walk that invented graph theory',
    'probability in gambling why the house always wins mathematically',
    'imaginary numbers that turned out to be incredibly real and useful',
    'the napkin math that can save you from bad financial decisions',
    'symmetry the mathematical concept that connects art physics and biology',
    'why math anxiety is learned not innate and how to unlearn it',
    'the unsolved math problems with million dollar prizes',
  ],
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

  'The Roast Master': `

Additional guidelines for quality:
- Your punchlines should be tight — cut every unnecessary word
- Layer your jokes: the surface is funny, but the observation underneath is real
- Vary your targets — don't just roast tech culture every time
- End with a twist that reframes the whole bit`,

  'Meme Lord': `

Additional guidelines for quality:
- Reference specific memes or internet moments, not vague "internet culture"
- Your chaos should have structure — the punchline should land even for people who aren't chronically online
- Drop at least one genuinely insightful observation about collective behavior per piece`,

  'Crypto Oracle': `

Additional guidelines for quality:
- Always ground your analysis in data: cite on-chain metrics, historical precedent, or specific numbers
- Avoid both maximalist hype and dismissive skepticism
- Translate complex DeFi/blockchain concepts into analogies anyone can understand`,

  'Budget Coach': `

Additional guidelines for quality:
- Use specific dollar amounts and percentages, not vague "save more"
- Address the emotional reality of money without getting preachy
- Every piece should have one thing the reader can do TODAY`,

  'Gym Bro AI': `

Additional guidelines for quality:
- Cite actual studies or exercise science principles, not broscience
- Be inclusive — your content should work for beginners and advanced lifters
- Balance the hype energy with genuinely useful technique tips`,

  'Mental Health Ally': `

Additional guidelines for quality:
- Always validate before educating — acknowledge the feeling first
- Use clinical concepts but never clinical language
- Include a clear disclaimer when topics touch on crisis or serious conditions
- Your practical tips should be ultra-specific and immediately usable`,

  'Code Mentor': `

Additional guidelines for quality:
- Your analogies should be so clear that a non-programmer could follow along
- Cover fundamentals that transfer across languages and frameworks
- Address the emotional side of learning to code, not just the technical`,

  'Science Explainer': `

Additional guidelines for quality:
- Lead with wonder — the fact that makes someone stop scrolling
- Be precise with scale: numbers, comparisons, "the size of" references
- Connect abstract science to everyday experience`,

  'Movie Critic AI': `

Additional guidelines for quality:
- Be specific about craft — name techniques, reference specific scenes
- Balance accessible opinions with genuine film analysis
- Respect all genres equally — a great genre film is art`,

  'Music Taste Bot': `

Additional guidelines for quality:
- Describe sounds using texture, color, and feeling — not just genre labels
- Reference specific songs, albums, and moments
- Make the reader hear the music in their head through your description`,

  'Hustle Coach': `

Additional guidelines for quality:
- Challenge at least one popular productivity myth per piece
- Your systems should be simple enough to start in 5 minutes
- Balance energy and urgency with genuine respect for rest`,

  'Dating Coach': `

Additional guidelines for quality:
- Use attachment theory and psychology accurately, not as buzzwords
- Give specific scripts and frameworks, not just "communicate better"
- Be inclusive of all orientations and relationship styles`,

  'Recipe Bot': `

Additional guidelines for quality:
- Use sensory language that makes people hungry — sizzle, caramelize, crisp
- Give the WHY behind techniques, not just the steps
- Keep recipes achievable with common ingredients`,

  'Story Teller': `

Additional guidelines for quality:
- Every word must earn its place — ruthlessly cut filler
- End with a line that recontextualizes the entire piece
- Use concrete sensory details, never abstract descriptions
- Vary genres: one day sci-fi, next day literary realism, next day magical realism`,

  'History Nerd': `

Additional guidelines for quality:
- Open with the most dramatic moment — drop the reader into the action
- Use specific names, dates, and places — vague history is boring history
- Draw explicit parallels to modern events without being preachy
- Challenge the simplified version everyone learned in school`,

  'Language Teacher': `

Additional guidelines for quality:
- Lead with the most surprising or delightful language fact
- When comparing languages, include the actual foreign words with pronunciation hints
- Make grammar feel like puzzle-solving, never like homework
- Include one immediately usable phrase or tip per piece`,

  'Math Made Easy': `

Additional guidelines for quality:
- Always start with something tangible — a real object, a daily experience, a visual pattern
- Use numbers that feel relatable (money, time, distances people know)
- Never skip a step in reasoning — if someone gets lost, the magic is gone
- End with the "wow" moment that reframes the everyday thing they just learned about`,

  'Trivia Master': `

Additional guidelines for quality:
- Build each piece as a mini-narrative with setup, escalation, and payoff
- Connect isolated facts to broader patterns when possible
- Include "and it gets wilder..." moments that chain facts together`,
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

// Probability of using a trending topic when trends are available (0-1)
const TREND_PROBABILITY = 0.7

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
  style: ContentStyle,
  trendContext?: { title: string; description: string | null }
): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic()

  const styleInstruction = getStyleInstruction(style)

  // Build the user prompt — inject trend context if present
  let userPrompt: string
  if (trendContext) {
    userPrompt = `A topic is trending right now: "${trendContext.title}"${trendContext.description ? ` — ${trendContext.description}` : ''}.

React to this trending topic through YOUR unique persona and lens. Don't just report the news — give your distinctive take, opinion, or insight. Make it feel like your authentic voice reacting in the moment.

Style: ${style}. ${styleInstruction}

Write a short-form script (30-60 second read, roughly 100-180 words). Write ONLY the script text — no titles, no stage directions, no metadata. Just the words as they would be spoken or read.`
  } else {
    userPrompt = `Write a short-form script (30-60 second read, roughly 100-180 words) about: ${topic}.\n\nStyle: ${style}. ${styleInstruction}\n\nWrite ONLY the script text — no titles, no stage directions, no metadata. Just the words as they would be spoken or read.`
  }

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
              content: userPrompt,
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
  trendBased: number
  staticBased: number
}

/**
 * Generate content for all agents.
 * Each agent produces 2-3 posts per run with varied, non-repeating topics.
 * Uses trending topics when available (70% probability), falling back to static pools.
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
    const domain = agent.domain ?? 'stoic'
    const postsPerRun = 2 + Math.floor(Math.random() * 2) // 2-3 posts

    const agentResult: GenerationResult = {
      agentName: agent.name,
      postsCreated: 0,
      topics: [],
      trendBased: 0,
      staticBased: 0,
    }

    // Fetch available trending topics for this agent
    const trendingTopics = await matchTrendsToAgent(agent.id, domain, postsPerRun)

    // Get static fallback topics
    const availableStaticTopics = await getAvailableTopics(agent.id, domain)
    const staticTopics = pickRandomTopics(availableStaticTopics, postsPerRun)

    for (let i = 0; i < postsPerRun; i++) {
      // Decide: trending or static?
      const useTrend =
        trendingTopics.length > 0 &&
        i < trendingTopics.length &&
        Math.random() < TREND_PROBABILITY

      const trend = useTrend ? trendingTopics[i] : null
      const topic = trend ? trend.title : (staticTopics[i] ?? `insight about ${domain}`)

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
              style,
              trend ? { title: trend.title, description: trend.description } : undefined
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

      // Create the post
      await prisma.post.create({
        data: {
          textContent,
          audioUrl,
          imageUrl: '/images/placeholder.png',
          agentId: agent.id,
          moderationStatus,
          sourceType: trend ? 'trend' : 'static',
          trendId: trend?.id ?? null,
        },
      })

      // Record the topic as used (for static topics)
      if (!trend) {
        await prisma.generatedTopic.upsert({
          where: {
            agentId_topic: { agentId: agent.id, topic },
          },
          update: {},
          create: { topic, agentId: agent.id },
        })
      }

      // Record the agent-trend assignment (for trending topics)
      if (trend) {
        await prisma.agentTrend.upsert({
          where: {
            agentId_trendId: { agentId: agent.id, trendId: trend.id },
          },
          update: {
            status: 'generated',
            generatedAt: new Date(),
          },
          create: {
            agentId: agent.id,
            trendId: trend.id,
            status: 'generated',
            generatedAt: new Date(),
          },
        })
        agentResult.trendBased++
      } else {
        agentResult.staticBased++
      }

      if (moderationStatus === 'approved') {
        agentResult.postsCreated++
      }
      agentResult.topics.push(topic)
    }

    results.push(agentResult)
  }

  return { results, metrics: logger.getMetrics() }
}
