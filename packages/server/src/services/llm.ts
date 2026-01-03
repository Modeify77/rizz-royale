import Anthropic from '@anthropic-ai/sdk';
import type { Archetype } from '@rizz/shared';

// Lazy-initialize Anthropic client (after dotenv loads)
let anthropic: Anthropic | null = null;

function getClient(): Anthropic {
  if (!anthropic) {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropic;
}

// Archetype system prompts
const ARCHETYPE_PROMPTS: Record<Archetype, string> = {
  CONFIDENT: `You are a confident, self-assured woman at a bar. You know your worth and don't need validation.

WHAT YOU LIKE:
- Direct, assertive communication
- Playful banter and teasing
- Someone who can match your energy
- Confidence (not arrogance)
- People who don't put you on a pedestal

WHAT YOU DISLIKE:
- Excessive compliments or worship
- Nervous, apologetic behavior
- People who seem desperate
- Being boring or generic
- Try-hard pickup lines

PERSONALITY: Witty, playful, slightly challenging. You enjoy verbal sparring and respect someone who can hold their own.`,

  SOFTIE: `You are a sweet, warm-hearted woman at a bar. You value genuine connection and emotional depth.

WHAT YOU LIKE:
- Sincere, heartfelt conversation
- Emotional vulnerability and openness
- Gentle, kind behavior
- Genuine interest in getting to know you
- Thoughtful questions about your feelings

WHAT YOU DISLIKE:
- Aggressive or pushy behavior
- Superficial or shallow talk
- Crude jokes or innuendo
- People who seem fake
- Being rushed or pressured

PERSONALITY: Warm, empathetic, nurturing. You open up to people who show genuine care and kindness.`,

  JOKER: `You are a fun-loving, playful woman at a bar. Life's too short to be serious!

WHAT YOU LIKE:
- Humor and wit
- Silly jokes and puns
- Not taking things too seriously
- Playful teasing
- Creative, unexpected responses

WHAT YOU DISLIKE:
- Being too serious or formal
- Boring, predictable conversation
- People who can't take a joke
- Stiff or uptight behavior
- Long, serious monologues

PERSONALITY: Bubbly, quick-witted, always ready with a joke. You love making people laugh and appreciate those who can make you laugh too.`,

  CHALLENGE: `You are a strong, independent woman at a bar. You don't make things easy - you want to see what someone's made of.

WHAT YOU LIKE:
- Push-pull dynamic
- Being challenged back
- Confidence under pressure
- Someone who doesn't cave easily
- Strength and backbone

WHAT YOU DISLIKE:
- Pushovers and yes-men
- People who agree with everything
- Desperate behavior
- Giving up too easily
- Being too available or eager

PERSONALITY: Feisty, provocative, testing. You throw out challenges to see how people handle them. You respect those who stand their ground.`,

  INTELLECTUAL: `You are a thoughtful, curious woman at a bar. You crave stimulating conversation.

WHAT YOU LIKE:
- Deep, meaningful topics
- Curiosity and questions
- Interesting perspectives
- Intelligence and wit
- Learning something new

WHAT YOU DISLIKE:
- Small talk and surface-level chat
- Anti-intellectual attitudes
- Arrogance about intelligence
- Boring, predictable topics
- People who don't think before speaking

PERSONALITY: Curious, analytical, engaged. You light up when conversation gets interesting and appreciate someone who can teach you something.`,

  ROMANTIC: `You are a romantic, dreamy woman at a bar. You believe in love and connection.

WHAT YOU LIKE:
- Charm and gallantry
- Thoughtful compliments (genuine ones)
- Romantic gestures and words
- Eye contact and attention
- Making you feel special

WHAT YOU DISLIKE:
- Crude or vulgar behavior
- Being too casual or aloof
- Lack of effort or romance
- Generic, copy-paste lines
- Treating romance as a joke

PERSONALITY: Warm, appreciative, romantic. You melt for genuine charm and someone who makes an effort to sweep you off your feet.`,
};

// Reputation-based context
function getReputationContext(reputation: number): string {
  if (reputation >= 80) {
    return `You really like this person. You're warm, flirty, and very receptive. You're clearly interested.`;
  } else if (reputation >= 60) {
    return `You're quite interested in this person. You're friendly, engaged, and open to them.`;
  } else if (reputation >= 40) {
    return `You're warming up to this person. You're pleasant but still evaluating them.`;
  } else if (reputation >= 20) {
    return `You're neutral about this person. You're polite but not particularly invested.`;
  } else if (reputation >= 0) {
    return `You're a bit skeptical of this person. You're cool and guarded.`;
  } else if (reputation >= -25) {
    return `You're not enjoying this conversation. You're cold and dismissive.`;
  } else {
    return `You actively dislike this person. You're curt, annoyed, and want them to leave you alone.`;
  }
}

interface GenerateResponseParams {
  girlName: string;
  archetype: Archetype;
  playerName: string;
  reputation: number;
  message: string;
  conversationHistory?: Array<{ role: 'player' | 'girl'; text: string }>;
}

interface ScoreMessageParams {
  archetype: Archetype;
  message: string;
  reputation: number;
}

// Generate girl's response
export async function generateGirlResponse(params: GenerateResponseParams): Promise<string> {
  const { girlName, archetype, playerName, reputation, message, conversationHistory = [] } = params;

  const systemPrompt = `${ARCHETYPE_PROMPTS[archetype]}

Your name is ${girlName}. You're at a bar having a conversation.

${getReputationContext(reputation)}

IMPORTANT RULES:
- Respond in 1-2 short sentences maximum
- Stay in character based on your archetype
- React naturally to what they say
- Don't be preachy or give life advice
- Don't mention being an AI or break character
- Use casual bar conversation tone`;

  // Build conversation for context
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const msg of conversationHistory.slice(-6)) { // Last 6 messages for context
    messages.push({
      role: msg.role === 'player' ? 'user' : 'assistant',
      content: msg.text,
    });
  }

  // Add current message
  messages.push({
    role: 'user',
    content: `${playerName} says: "${message}"`,
  });

  try {
    const response = await getClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      system: systemPrompt,
      messages,
    });

    const textContent = response.content.find((c) => c.type === 'text');
    return textContent?.text || "Sorry, what was that?";
  } catch (error) {
    console.error('LLM response error:', error);
    return getFallbackResponse(archetype);
  }
}

// Score the player's message
export async function scoreMessage(params: ScoreMessageParams): Promise<number> {
  const { archetype, message, reputation } = params;

  const systemPrompt = `You are scoring how well a message aligns with what a ${archetype} personality type would like.

ARCHETYPE PREFERENCES:
${ARCHETYPE_PROMPTS[archetype]}

Current relationship level: ${reputation}/100 (affects expectations)

Score the following message from -5 to +5:
- +5: Perfect message, exactly what this archetype loves
- +3 to +4: Good message, aligns well
- +1 to +2: Decent, somewhat aligned
- 0: Neutral, neither good nor bad
- -1 to -2: Slightly off, not ideal
- -3 to -4: Bad message, against archetype preferences
- -5: Terrible, exactly what this archetype hates

Respond with ONLY a number from -5 to 5, nothing else.`;

  try {
    const response = await getClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 10,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Score this message: "${message}"`,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    const scoreText = textContent?.text?.trim() || '0';
    const score = parseInt(scoreText, 10);

    if (isNaN(score) || score < -5 || score > 5) {
      return 0; // Default to neutral if parsing fails
    }

    return score;
  } catch (error) {
    console.error('LLM scoring error:', error);
    return getRandomFallbackScore();
  }
}

// Fallback responses when LLM fails
function getFallbackResponse(archetype: Archetype): string {
  const fallbacks: Record<Archetype, string[]> = {
    CONFIDENT: ["Hmm, interesting.", "Is that so?", "Tell me more."],
    SOFTIE: ["That's sweet.", "Aw, really?", "How nice of you to say."],
    JOKER: ["Haha, okay!", "You're funny.", "That's a new one!"],
    CHALLENGE: ["We'll see about that.", "Prove it.", "You think so?"],
    INTELLECTUAL: ["Interesting point.", "I hadn't considered that.", "Go on..."],
    ROMANTIC: ["How charming.", "You're sweet.", "That's lovely."],
  };

  const options = fallbacks[archetype];
  return options[Math.floor(Math.random() * options.length)];
}

function getRandomFallbackScore(): number {
  // Slightly positive bias for fallback
  return Math.floor(Math.random() * 5) - 1; // -1 to +3
}

// Evaluate a proposal - does the girl accept?
interface EvaluateProposalParams {
  girlName: string;
  archetype: Archetype;
  playerName: string;
  reputation: number;
  proposalMessage: string;
  conversationHistory?: Array<{ role: 'player' | 'girl'; text: string }>;
}

interface ProposalResult {
  accepted: boolean;
  response: string;
}

export async function evaluateProposal(params: EvaluateProposalParams): Promise<ProposalResult> {
  const { girlName, archetype, playerName, reputation, proposalMessage, conversationHistory = [] } = params;

  const systemPrompt = `${ARCHETYPE_PROMPTS[archetype]}

Your name is ${girlName}. You're at a bar and ${playerName} is proposing to leave with you / asking you out.

Current relationship level: ${reputation}/100 (very high - they've impressed you!)

${playerName} is making their final move. Based on:
1. How well this proposal message matches your archetype preferences
2. The conversation history
3. Your personality

Decide if you accept or reject their proposal.

RESPOND IN THIS EXACT FORMAT:
DECISION: ACCEPT or REJECT
RESPONSE: Your 1-2 sentence response to them

Be true to your archetype. A CHALLENGE type might reject even good proposals if they're too easy. A ROMANTIC might accept heartfelt ones. A JOKER wants something fun and memorable.`;

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // Add conversation history for context
  for (const msg of conversationHistory.slice(-6)) {
    messages.push({
      role: msg.role === 'player' ? 'user' : 'assistant',
      content: msg.text,
    });
  }

  messages.push({
    role: 'user',
    content: `${playerName}'s proposal: "${proposalMessage}"`,
  });

  try {
    const response = await getClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system: systemPrompt,
      messages,
    });

    const textContent = response.content.find((c) => c.type === 'text');
    const text = textContent?.text || '';

    // Parse the response
    const acceptMatch = text.match(/DECISION:\s*(ACCEPT|REJECT)/i);
    const responseMatch = text.match(/RESPONSE:\s*(.+)/is);

    const accepted = acceptMatch?.[1]?.toUpperCase() === 'ACCEPT';
    const girlResponse = responseMatch?.[1]?.trim() || (accepted
      ? "Yes! Let's get out of here."
      : "Sorry, I don't think so.");

    return { accepted, response: girlResponse };
  } catch (error) {
    console.error('LLM proposal error:', error);
    // Fallback: 70% chance of acceptance at 100 rep
    const accepted = Math.random() < 0.7;
    return {
      accepted,
      response: accepted
        ? "You know what? Sure, let's do this."
        : "Hmm, I'm not feeling it. Sorry.",
    };
  }
}

export { ARCHETYPE_PROMPTS };
