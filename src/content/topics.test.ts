import { describe, expect, it } from 'vitest';

import { calibrationFor } from '@/content/calibration';
import { WORLD_TOPICS } from '@/content/topics';

describe('WORLD_TOPICS', () => {
  // The compiler already guarantees every `dataKey` names a real entry. What it
  // cannot catch is a topic added with a `dataKey` copied from the line above
  // it, which type-checks fine and quietly shows two topics the same screen.
  it('resolves every topic to content', () => {
    for (const topic of WORLD_TOPICS) {
      expect(calibrationFor(topic), topic.id).not.toBeNull();
    }
  });

  it('gives every topic but the escape hatch its own data', () => {
    const named = WORLD_TOPICS.filter((topic) => topic.id !== 'unsure');
    const keys = named.map((topic) => topic.dataKey);

    expect(new Set(keys).size).toBe(named.length);
    // The general entry is what "all of it" is for, and nothing else should
    // land on it — a named topic pointing there is a topic with no content.
    expect(keys).not.toContain('world');
  });

  it('offers a way through for someone who cannot name it', () => {
    expect(WORLD_TOPICS.some((topic) => topic.id === 'unsure')).toBe(true);
  });
});

describe('calibrationFor', () => {
  it('has nothing to show without a topic', () => {
    expect(calibrationFor(null)).toBeNull();
  });
});
