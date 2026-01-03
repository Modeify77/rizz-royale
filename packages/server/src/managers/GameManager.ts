import type { Girl, Archetype, Lobby, Player } from '@rizz/shared';
import { NUM_GIRLS, INITIAL_REP } from '@rizz/shared';

// Girl name pools
const GIRL_NAMES = [
  'Amber', 'Bella', 'Chloe', 'Diana', 'Eva', 'Fiona',
  'Grace', 'Hazel', 'Ivy', 'Jade', 'Kate', 'Luna',
  'Mia', 'Nina', 'Olivia', 'Paige', 'Quinn', 'Rose',
  'Sophia', 'Tara', 'Uma', 'Violet', 'Willow', 'Zoe',
];

const ARCHETYPES: Archetype[] = [
  'CONFIDENT',
  'SOFTIE',
  'JOKER',
  'CHALLENGE',
  'INTELLECTUAL',
  'ROMANTIC',
];

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Fetch anime waifu images from waifu.im API
async function fetchWaifuImages(count: number): Promise<string[]> {
  try {
    const response = await fetch(
      `https://api.waifu.im/search?included_tags=waifu&many=true&limit=${count}`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.images && Array.isArray(data.images)) {
      return data.images.map((img: { url: string }) => img.url);
    }

    throw new Error('Invalid API response');
  } catch (error) {
    console.error('Failed to fetch waifu images:', error);
    // Return fallback placeholder URLs
    return Array(count).fill('').map((_, i) =>
      `https://api.dicebear.com/7.x/lorelei/svg?seed=girl${i}&backgroundColor=transparent`
    );
  }
}

export async function generateGirls(): Promise<Girl[]> {
  // Shuffle names and archetypes
  const shuffledNames = shuffleArray(GIRL_NAMES).slice(0, NUM_GIRLS);
  const shuffledArchetypes = shuffleArray(ARCHETYPES);

  // Fetch waifu images
  const avatarUrls = await fetchWaifuImages(NUM_GIRLS);

  return shuffledNames.map((name, index) => ({
    id: `girl-${index + 1}`,
    name,
    archetype: shuffledArchetypes[index],
    avatarUrl: avatarUrls[index] || `https://api.dicebear.com/7.x/lorelei/svg?seed=${name}`,
  }));
}

export function initializePlayerReputations(players: Player[], girls: Girl[]): void {
  for (const player of players) {
    player.reputation = {};
    for (const girl of girls) {
      player.reputation[girl.id] = INITIAL_REP;
    }
  }
}

export async function startGame(lobby: Lobby): Promise<Girl[]> {
  const girls = await generateGirls();
  lobby.girls = girls;
  lobby.status = 'playing';

  // Initialize all players with +5 rep for each girl
  initializePlayerReputations(lobby.players, girls);

  return girls;
}

// Get public girl data (without archetypes)
export function getPublicGirls(girls: Girl[]): Omit<Girl, 'archetype'>[] {
  return girls.map(({ id, name, avatarUrl }) => ({ id, name, avatarUrl }));
}
