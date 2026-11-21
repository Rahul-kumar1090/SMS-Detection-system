import type { PreprocessingSteps, TextSignals } from '../types';

/**
 * Standard NLTK-style English stop words list for text preprocessing
 */
export const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and',
  'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below',
  'between', 'both', 'but', 'by', 'can', 'could', 'did', 'do', 'does', 'doing',
  'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have',
  'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'might',
  'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once',
  'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same',
  'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs',
  'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through',
  'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when',
  'where', 'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'would', 'you',
  'your', 'yours', 'yourself', 'yourselves', 'im', 'ive', 'dont', 'cant', 'wont',
  'ill', 'id', 'youre', 'thats', 'its', 'hi', 'hello', 'dear', 'please', 'thanks',
]);

/**
 * Lightweight Porter-inspired English suffix stemmer
 */
export function stemWord(word: string): string {
  if (word.length <= 3) return word;

  let w = word;

  // Step 1a: Plurals
  if (w.endsWith('sses')) {
    w = w.slice(0, -2);
  } else if (w.endsWith('ies') && w.length > 4) {
    w = w.slice(0, -3) + 'y';
  } else if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is') && w.length > 4) {
    w = w.slice(0, -1);
  }

  // Step 1b: Past / progressive endings
  if (w.endsWith('eed') && w.length > 5) {
    w = w.slice(0, -1);
  } else if (w.endsWith('ing') && w.length > 5) {
    const base = w.slice(0, -3);
    if (/[aeiou]/.test(base)) {
      w = base;
      if (/(.)\1$/.test(w) && !/[lsz]$/.test(w)) {
        w = w.slice(0, -1);
      }
    }
  } else if (w.endsWith('ed') && w.length > 4) {
    const base = w.slice(0, -2);
    if (/[aeiou]/.test(base)) {
      w = base;
      if (/(.)\1$/.test(w) && !/[lsz]$/.test(w)) {
        w = w.slice(0, -1);
      }
    }
  }

  // Step 2: Common derivational suffixes
  const suffixMap: [string, string][] = [
    ['ational', 'ate'],
    ['tional', 'tion'],
    ['ization', 'ize'],
    ['ation', 'ate'],
    ['ator', 'ate'],
    ['fulness', 'ful'],
    ['ousness', 'ous'],
    ['iveness', 'ive'],
    ['biliti', 'ble'],
    ['ments', 'ment'],
    ['ment', ''],
    ['ness', ''],
    ['able', ''],
    ['ible', ''],
    ['ally', 'al'],
    ['ingly', ''],
  ];

  for (const [suffix, replacement] of suffixMap) {
    if (w.endsWith(suffix) && w.length - suffix.length >= 3) {
      w = w.slice(0, -suffix.length) + replacement;
      break;
    }
  }

  return w;
}

const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+|\b[a-z0-9-]+\.(com|net|org|co|io|xyz|top|info|biz|click|link|in|uk)\b\/?[^\s]*)/gi;
const CURRENCY_REGEX = /(\$|£|€|₹|\b(usd|inr|rs|gbp|eur|cash|prize|bonus|jackpot|lakh|crore)\b)/gi;
const PHONE_REGEX = /(\+?\d[\d\s-]{8,14}\d|\b\d{5,6}\b)/g;

export function analyzeSignals(text: string): TextSignals {
  const trimmed = text.trim();
  const charCount = trimmed.length;
  const words = trimmed ? trimmed.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;

  let letterCount = 0;
  let upperCount = 0;
  let digitCount = 0;
  let exclamationCount = 0;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch >= 'A' && ch <= 'Z') {
      upperCount++;
      letterCount++;
    } else if (ch >= 'a' && ch <= 'z') {
      letterCount++;
    } else if (ch >= '0' && ch <= '9') {
      digitCount++;
    } else if (ch === '!') {
      exclamationCount++;
    }
  }

  const urlMatches = trimmed.match(URL_REGEX);
  const currencyMatches = trimmed.match(CURRENCY_REGEX);

  return {
    charCount,
    wordCount,
    uppercaseRatio: letterCount > 0 ? upperCount / letterCount : 0,
    urlCount: urlMatches ? urlMatches.length : 0,
    exclamationCount,
    currencyCount: currencyMatches ? currencyMatches.length : 0,
    digitRatio: charCount > 0 ? digitCount / charCount : 0,
  };
}

export interface PreprocessOptions {
  removeStopwords: boolean;
  applyStemming: boolean;
  useBigrams: boolean;
}

/**
 * Full step-by-step NLP text preprocessing pipeline:
 * 1. Lowercasing
 * 2. Punctuation & special character removal
 * 3. Tokenization
 * 4. Stop word removal
 * 5. Stemming
 * 6. Structural feature normalization + optional bigrams
 */
export function preprocessText(
  rawText: string,
  options: PreprocessOptions
): PreprocessingSteps {
  const signals = analyzeSignals(rawText);
  const lowercased = rawText.toLowerCase();

  // Extract structural indicators before stripping URLs/punctuation
  const hasUrl = URL_REGEX.test(rawText);
  URL_REGEX.lastIndex = 0;
  const hasCurrency = /[$£€₹]/.test(rawText);
  const hasPhone = PHONE_REGEX.test(rawText);
  PHONE_REGEX.lastIndex = 0;

  // Replace URLs with space so domain noise doesn't pollute tokens, while preserving signal
  const withoutUrls = lowercased.replace(URL_REGEX, ' ');
  URL_REGEX.lastIndex = 0;

  // Remove punctuation, digits-only noise, and special characters
  const cleaned = withoutUrls
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b\d+\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = cleaned
    ? cleaned.split(' ').filter((t) => t.length >= 2)
    : [];

  const withoutStopwords = options.removeStopwords
    ? tokens.filter((t) => !STOP_WORDS.has(t))
    : [...tokens];

  const stemmed = options.applyStemming
    ? withoutStopwords.map((t) => stemWord(t))
    : [...withoutStopwords];

  const finalFeatures = [...stemmed];

  if (options.useBigrams && stemmed.length >= 2) {
    for (let i = 0; i < stemmed.length - 1; i++) {
      finalFeatures.push(`${stemmed[i]}_${stemmed[i + 1]}`);
    }
  }

  // Structural indicators reflecting Chapter 1 patterns (suspicious links, excessive capitals, currency, shortcodes)
  if (hasUrl) finalFeatures.push('[has_url]');
  if (hasCurrency) finalFeatures.push('[has_currency]');
  if (hasPhone) finalFeatures.push('[has_number]');
  if (signals.uppercaseRatio >= 0.3 && signals.wordCount >= 3) {
    finalFeatures.push('[high_caps]');
  }
  if (signals.exclamationCount >= 2) {
    finalFeatures.push('[multi_exclaim]');
  }

  return {
    raw: rawText,
    lowercased,
    cleaned,
    tokens,
    withoutStopwords,
    stemmed,
    finalFeatures,
    signals,
  };
}
