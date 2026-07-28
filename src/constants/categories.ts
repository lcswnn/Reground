import type { StoryCategory } from '@/types/database';

interface CategoryMeta {
  label: string;
  /** SF Symbol name — iOS only, used by expo-symbols. */
  symbol: string;
}

export const CATEGORIES: Record<StoryCategory, CategoryMeta> = {
  health: { label: 'Health', symbol: 'heart.fill' },
  poverty: { label: 'Poverty', symbol: 'house.fill' },
  climate: { label: 'Climate', symbol: 'leaf.fill' },
  energy: { label: 'Energy', symbol: 'bolt.fill' },
  education: { label: 'Education', symbol: 'book.fill' },
  science: { label: 'Science', symbol: 'atom' },
  rights: { label: 'Rights', symbol: 'hand.raised.fill' },
  conservation: { label: 'Nature', symbol: 'tree.fill' },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as StoryCategory[];
