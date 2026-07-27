import type { StoryCategory } from '@/types/database';

interface CategoryMeta {
  label: string;
  /** SF Symbol name — iOS only, used by expo-symbols. */
  symbol: string;
  emoji: string;
}

export const CATEGORIES: Record<StoryCategory, CategoryMeta> = {
  health: { label: 'Health', symbol: 'heart.fill', emoji: '❤️' },
  poverty: { label: 'Poverty', symbol: 'house.fill', emoji: '🏠' },
  climate: { label: 'Climate', symbol: 'leaf.fill', emoji: '🌍' },
  energy: { label: 'Energy', symbol: 'bolt.fill', emoji: '⚡' },
  education: { label: 'Education', symbol: 'book.fill', emoji: '📚' },
  science: { label: 'Science', symbol: 'atom', emoji: '🔬' },
  rights: { label: 'Rights', symbol: 'hand.raised.fill', emoji: '✊' },
  conservation: { label: 'Nature', symbol: 'tree.fill', emoji: '🌳' },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as StoryCategory[];
