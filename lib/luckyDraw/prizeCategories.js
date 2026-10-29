// Prize categories: "10 winners get ₹3,000 each". No server-only imports, so the create form
// can run the same checks the API does.
import { MAX_PRIZE_CATEGORIES, MAX_PRIZE_IMAGE_BYTES, MAX_TOTAL_WINNERS, REQUIRED_PRIZE_LEVELS } from './constants';

const IMAGE_DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

const toNumber = (value) => (typeof value === 'string' && value.trim() !== '' ? Number(value) : value);

function imageError(imageUrl) {
  if (imageUrl == null || imageUrl === '') return null;
  if (typeof imageUrl !== 'string' || !IMAGE_DATA_URL.test(imageUrl)) {
    return 'Prize images must be JPEG, PNG or WebP pictures';
  }
  const base64 = imageUrl.slice(imageUrl.indexOf(',') + 1);
  if (Math.ceil((base64.length * 3) / 4) > MAX_PRIZE_IMAGE_BYTES) {
    return 'A prize image is too large. Use a picture under 200 KB.';
  }
  return null;
}

/** Error message for the first problem found, or null when every category is valid. */
export function validatePrizeCategories(prizes) {
  if (!Array.isArray(prizes) || prizes.length === 0) return 'Add at least one prize';
  if (prizes.length > MAX_PRIZE_CATEGORIES) return `Add at most ${MAX_PRIZE_CATEGORIES} prize categories`;

  let totalWinners = 0;
  for (const prize of prizes) {
    const name = String(prize?.prizeDescription ?? '').trim();
    if (!name) return 'Give every prize a name';
    if (name.length > 200) return 'Prize names can be at most 200 characters';

    const value = toNumber(prize.prizeValue);
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
      return `Enter a value in rupees for ${name}`;
    }

    const quantity = toNumber(prize.quantity ?? 1);
    if (!Number.isInteger(quantity) || quantity < 1) return `Enter how many winners get ${name} (1 or more)`;
    totalWinners += quantity;

    const imageProblem = imageError(prize.imageUrl);
    if (imageProblem) return imageProblem;
  }
  if (totalWinners > MAX_TOTAL_WINNERS) return `A draw can have at most ${MAX_TOTAL_WINNERS.toLocaleString('en-IN')} winners`;
  return null;
}

/** One slot per winner, in rank order: a category with 5 winners appears 5 times. */
export function expandPrizeSlots(prizeTiers) {
  return [...prizeTiers]
    .sort((a, b) => a.rank - b.rank)
    .flatMap((tier) => Array.from({ length: Math.max(1, tier.quantity || 1) }, () => ({ ...tier })));
}

/** Ranks in the order prizes are revealed live: the smallest prize first and the grand prize last. */
export function revealOrder(prizeTiers) {
  return [...prizeTiers].map((tier) => tier.rank).sort((a, b) => b - a);
}

export function prizeTotals(prizeTiers) {
  return prizeTiers.reduce(
    (acc, tier) => {
      const quantity = tier.quantity || 1;
      return {
        totalValue: acc.totalValue + (tier.prizeValue || 0) * quantity,
        totalWinners: acc.totalWinners + quantity,
      };
    },
    { totalValue: 0, totalWinners: 0 },
  );
}

const LEVELS_MESSAGE = 'Add the Grand Prize, the Second Prize and the Third Prize (smaller prizes are optional)';

/** True when the ranks run 1, 2, 3, … with none missing or repeated, and there are at least `min` of them. */
export function ranksAreConsecutive(ranks, min) {
  const sorted = ranks.map(Number).sort((a, b) => a - b);
  return sorted.length >= min && sorted.every((rank, i) => rank === i + 1);
}

/**
 * Prize levels: rank 1 grand prize (exactly one winner), ranks 2 and 3 are required, and any
 * smaller prizes follow as 4, 5, … with no gaps. Returns the first problem found, or null.
 */
export function validatePrizeLevels(prizes) {
  if (!Array.isArray(prizes)) return LEVELS_MESSAGE;
  if (!ranksAreConsecutive(prizes.map((prize) => prize?.rank), REQUIRED_PRIZE_LEVELS)) return LEVELS_MESSAGE;

  const problem = validatePrizeCategories(prizes);
  if (problem) return problem;

  const grand = prizes.find((prize) => Number(prize.rank) === 1);
  if (Number(toNumber(grand.quantity ?? 1)) !== 1) return 'The Grand Prize has exactly 1 winner';
  return null;
}

/** Clean prize levels as stored on the campaign, sorted grand prize first. */
export function normalizePrizeLevels(prizes) {
  return [...prizes]
    .sort((a, b) => Number(a.rank) - Number(b.rank))
    .map((prize) => {
      const rank = Number(prize.rank);
      return {
        rank,
        prizeDescription: String(prize.prizeDescription).trim(),
        prizeValue: Number(toNumber(prize.prizeValue)) || 0,
        quantity: rank === 1 ? 1 : Number(toNumber(prize.quantity ?? 1)) || 1,
        imageUrl: prize.imageUrl ? prize.imageUrl : null,
      };
    });
}
